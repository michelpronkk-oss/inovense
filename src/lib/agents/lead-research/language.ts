import { getClientLocaleForLeadSource } from "@/lib/client-locale";
import type { LeadResearchInput } from "./schema";

export type LanguageResolution = {
  output_language: "en" | "nl";
  detected_website_language: "en" | "nl" | "mixed" | "unknown";
  language_reason:
    | "website_detected"
    | "lead_source_fallback"
    | "manual_override";
};

export function resolveOutputLanguage(
  input: Pick<LeadResearchInput, "force_output_language" | "lead_source">,
  detectedWebsiteLanguage: "en" | "nl" | "mixed" | "unknown"
): LanguageResolution {
  // Manual override wins
  if (input.force_output_language) {
    return {
      output_language: input.force_output_language,
      detected_website_language: detectedWebsiteLanguage,
      language_reason: "manual_override",
    };
  }

  // Website language — use if unambiguous
  if (detectedWebsiteLanguage === "nl" || detectedWebsiteLanguage === "en") {
    return {
      output_language: detectedWebsiteLanguage,
      detected_website_language: detectedWebsiteLanguage,
      language_reason: "website_detected",
    };
  }

  // Fall back to lead source locale logic
  const locale = getClientLocaleForLeadSource(input.lead_source);
  return {
    output_language: locale,
    detected_website_language: detectedWebsiteLanguage,
    language_reason: "lead_source_fallback",
  };
}
