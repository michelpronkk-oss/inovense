// Shared, connector-agnostic personalization helpers.
//
// These mirror the proven name-detection rules that Revenue Operator uses
// (signature beats email local part, company name is never a first name,
// reject greetings/role words, never merge sign-off lines). They are factored
// out so Client Flow can reuse the same safe behavior without importing from or
// modifying the Revenue scan module. Revenue intentionally keeps its own copy.

import { findContactByEmail } from "@/lib/operators/executors/hubspot";

export type SharedPersonalizationSource =
  | "hubspot"
  | "signature"
  | "from_display"
  | "email_local"
  | "fallback";

export type SharedPersonalization = {
  contactEmail: string;
  contactName: string | null;
  firstname: string | null;
  lastname: string | null;
  greetingUsed: string;
  personalizationSource: SharedPersonalizationSource;
  signatureCandidate?: string | null;
  signatureCandidateAccepted?: string | null;
  rejectedNameCandidates: { candidate: string; reason: string; source: string }[];
};

const GENERIC_NAME_PARTS = new Set([
  "info", "sales", "support", "hello", "admin", "noreply", "no-reply", "contact",
  "team", "newsletter", "office", "service", "help", "marketing", "founder", "agency",
]);
const NAME_CONTAMINATION_PARTS = new Set(["hi", "hello", "hey", "dear", "hoi", "hallo", "michel"]);

function titleCaseName(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

export function splitHumanName(value: string | null): { firstname: string | null; lastname: string | null } {
  if (!value) return { firstname: null, lastname: null };
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstname: null, lastname: null };
  if (parts.length === 1) return { firstname: parts[0], lastname: null };
  return { firstname: parts[0], lastname: parts.slice(1).join(" ") };
}

function isGenericName(value: string): boolean {
  const cleaned = value.trim().toLowerCase();
  if (!cleaned) return true;
  if (GENERIC_NAME_PARTS.has(cleaned)) return true;
  return cleaned.split(/[\s._+-]+/).some((part) => GENERIC_NAME_PARTS.has(part));
}

export function safeHumanName(value: string | null | undefined): { name: string | null; reason?: string } {
  if (!value) return { name: null, reason: "empty" };
  const cleaned = value
    .replace(/<[^>]+>/g, " ")
    .replace(/["“”]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return { name: null, reason: "empty" };
  if (cleaned.includes("@")) return { name: null, reason: "contains_email" };
  if (/\d/.test(cleaned)) return { name: null, reason: "contains_number" };
  if (/\b(?:www\.|\.com|\.net|\.org|\.io|\.co|https?:\/\/)\b/i.test(cleaned)) return { name: null, reason: "contains_domain" };
  if ((cleaned.match(/[^\p{L}\s'-]/gu) ?? []).length > 0) return { name: null, reason: "punctuation_heavy" };
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0 || parts.length > 3) return { name: null, reason: "invalid_word_count" };
  if (parts.some((part) => part.length < 2)) return { name: null, reason: "too_short" };
  if (parts.some((part) => isGenericName(part))) return { name: null, reason: "generic" };
  if (parts.some((part) => NAME_CONTAMINATION_PARTS.has(part.toLowerCase()))) return { name: null, reason: "contains_greeting_or_body_word" };
  if (parts.some((part) => !/^\p{L}[\p{L}'-]*$/u.test(part))) return { name: null, reason: "username_like" };
  return { name: titleCaseName(parts.join(" ")) };
}

function displayNameFromHeader(from: string, email: string): string | null {
  const rawName = from.replace(/<[^>]+>/g, "").replace(/"/g, "").trim();
  if (!rawName || rawName.toLowerCase() === email.toLowerCase() || rawName.includes("@")) return null;
  const cleaned = rawName.replace(/\s+via\s+.+$/i, "").trim();
  return safeHumanName(cleaned).name;
}

function humanNameFromEmailLocal(email: string): string | null {
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  if (!local || /\d/.test(local)) return null;
  const parts = local.split(/[._+-]+/).filter(Boolean);
  if (parts.length === 0 || parts.length > 3) return null;
  if (parts.some((part) => part.length < 2 || isGenericName(part))) return null;
  return safeHumanName(parts.join(" ")).name;
}

function cleanSignatureCandidate(candidate: string): { candidate: string; reduced?: boolean } {
  const parts = candidate.trim().split(/\s+/).filter(Boolean);
  const contaminationIndex = parts.findIndex((part, index) => index > 0 && NAME_CONTAMINATION_PARTS.has(part.toLowerCase()));
  if (contaminationIndex > 0) {
    return { candidate: parts.slice(0, contaminationIndex).join(" "), reduced: true };
  }
  return { candidate: candidate.trim() };
}

function isSignoffLine(line: string): boolean {
  const normalized = line.trim().replace(/[,.\s]+$/g, "").toLowerCase();
  return [
    "best",
    "best regards",
    "kind regards",
    "regards",
    "thanks",
    "thank you",
    "cheers",
    "met vriendelijke groet",
    "groet",
    "vriendelijke groet",
  ].includes(normalized);
}

function nameFromSignatureText(text: string): {
  name: string | null;
  candidate?: string;
  accepted?: string;
  rejected?: { candidate: string; reason: string; source: string };
} {
  const lastLines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-20);
  for (let index = lastLines.length - 2; index >= 0; index -= 1) {
    if (!isSignoffLine(lastLines[index])) continue;
    const rawCandidate = lastLines[index + 1] ?? "";
    const cleaned = cleanSignatureCandidate(rawCandidate);
    const safe = safeHumanName(cleaned.candidate);
    if (safe.name) return { name: safe.name, candidate: rawCandidate, accepted: safe.name };
    return { name: null, candidate: rawCandidate, rejected: { candidate: rawCandidate, reason: safe.reason ?? "unsafe", source: "signature" } };
  }
  return { name: null };
}

export function applyGreeting(body: string, greeting: string): string {
  const lines = body.trim().split(/\r?\n/);
  if (lines[0] && /^hi\b/i.test(lines[0].trim())) {
    return [greeting, ...lines.slice(1)].join("\n");
  }
  return [greeting, "", body.trim()].join("\n");
}

/**
 * Build a safe greeting/personalization for a contact from a Gmail-style
 * message. Order of trust: HubSpot (if connected) -> email signature ->
 * From display name -> email local part -> generic fallback ("Hi,").
 */
export async function buildContactPersonalization(input: {
  workspaceId: string;
  from: string;
  fromEmail: string;
  bodyText?: string | null;
  snippet?: string | null;
  hubspotConnected?: boolean;
}): Promise<SharedPersonalization> {
  const email = input.fromEmail;
  const rejectedNameCandidates: { candidate: string; reason: string; source: string }[] = [];

  if (input.hubspotConnected) {
    try {
      const contact = await findContactByEmail(input.workspaceId, email);
      const first = typeof contact?.properties?.firstname === "string" ? contact.properties.firstname.trim() : "";
      const last = typeof contact?.properties?.lastname === "string" ? contact.properties.lastname.trim() : "";
      const contactName = safeHumanName([first, last].filter(Boolean).join(" ")).name;
      if (contactName) {
        const split = splitHumanName(contactName);
        return {
          contactEmail: email,
          contactName,
          firstname: split.firstname,
          lastname: split.lastname,
          greetingUsed: `Hi ${split.firstname ?? contactName},`,
          personalizationSource: "hubspot",
          rejectedNameCandidates,
        };
      }
    } catch (error) {
      console.warn("[client-flow] hubspot personalization skipped", {
        workspaceId: input.workspaceId,
        email,
        error: error instanceof Error ? error.message : "Unknown HubSpot lookup error",
      });
    }
  }

  const signature = nameFromSignatureText([input.bodyText, input.snippet].filter(Boolean).join("\n"));
  if (signature.rejected) rejectedNameCandidates.push(signature.rejected);
  if (signature.name) {
    const split = splitHumanName(signature.name);
    return {
      contactEmail: email,
      contactName: signature.name,
      firstname: split.firstname,
      lastname: split.lastname,
      greetingUsed: `Hi ${split.firstname ?? signature.name},`,
      personalizationSource: "signature",
      signatureCandidate: signature.candidate ?? signature.name,
      signatureCandidateAccepted: signature.accepted ?? signature.name,
      rejectedNameCandidates,
    };
  }

  const fromName = displayNameFromHeader(input.from, email);
  if (fromName) {
    const split = splitHumanName(fromName);
    return {
      contactEmail: email,
      contactName: fromName,
      firstname: split.firstname,
      lastname: split.lastname,
      greetingUsed: `Hi ${split.firstname ?? fromName},`,
      personalizationSource: "from_display",
      signatureCandidate: signature.candidate ?? null,
      rejectedNameCandidates,
    };
  }

  const localName = humanNameFromEmailLocal(email);
  if (localName) {
    const split = splitHumanName(localName);
    return {
      contactEmail: email,
      contactName: localName,
      firstname: split.firstname,
      lastname: split.lastname,
      greetingUsed: `Hi ${split.firstname ?? localName},`,
      personalizationSource: "email_local",
      signatureCandidate: signature.candidate ?? null,
      rejectedNameCandidates,
    };
  }

  return {
    contactEmail: email,
    contactName: null,
    firstname: null,
    lastname: null,
    greetingUsed: "Hi,",
    personalizationSource: "fallback",
    signatureCandidate: signature.candidate ?? null,
    rejectedNameCandidates,
  };
}
