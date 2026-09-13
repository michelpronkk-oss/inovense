import { PLAN_SLUGS, type PlanSlug } from "@/lib/plan-identity";

export const EARLY_ACCESS_TEAM_SIZES = ["1–5", "6–20", "21–50", "51–100", "101–250", "251+"] as const;
export const EARLY_ACCESS_PLANS = PLAN_SLUGS;

export type EarlyAccessPlan = PlanSlug;
export type EarlyAccessTeamSize = (typeof EARLY_ACCESS_TEAM_SIZES)[number];

export type EarlyAccessSubmission = {
  name: string;
  email: string;
  company: string;
  role: string | null;
  teamSize: EarlyAccessTeamSize;
  useCase: string;
  interestedPlan: EarlyAccessPlan | null;
  source: "homepage";
  sourcePath: string;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  locale: string;
};

export type EarlyAccessValidation =
  | { ok: true; data: EarlyAccessSubmission }
  | { ok: false; errors: Record<string, string> };

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g;

function clean(value: unknown): string {
  return typeof value === "string" ? value.replace(CONTROL_CHARACTERS, "").trim() : "";
}

function optionalText(value: unknown, field: string, max: number, errors: Record<string, string>): string | null {
  const result = clean(value);
  if (result.length > max) errors[field] = `Use ${max} characters or fewer.`;
  return result || null;
}

function safeReferrer(value: unknown): string | null {
  const result = clean(value);
  if (!result || result.length > 2048) return null;
  try {
    const url = new URL(result);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return `${url.origin}${url.pathname}`.slice(0, 512);
  } catch {
    return null;
  }
}

export function parseEarlyAccessSubmission(value: unknown): EarlyAccessValidation {
  const body = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const errors: Record<string, string> = {};

  const name = clean(body.name);
  const email = clean(body.email).toLowerCase();
  const company = clean(body.company);
  const teamSize = clean(body.teamSize);
  const useCase = clean(body.useCase);
  const role = optionalText(body.role, "role", 100, errors);

  if (!name) errors.name = "Add your name.";
  else if (name.length > 100) errors.name = "Use 100 characters or fewer.";

  if (!email) errors.email = "Add your work email.";
  else if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address.";

  if (!company) errors.company = "Add your company.";
  else if (company.length > 160) errors.company = "Use 160 characters or fewer.";

  if (!(EARLY_ACCESS_TEAM_SIZES as readonly string[]).includes(teamSize)) errors.teamSize = "Choose a team size.";

  if (!useCase) errors.useCase = "Tell us what you want Auterim to handle first.";
  else if (useCase.length > 1200) errors.useCase = "Use 1,200 characters or fewer.";

  const interestedPlan = clean(body.interestedPlan);
  if (interestedPlan && !(EARLY_ACCESS_PLANS as readonly string[]).includes(interestedPlan)) {
    errors.interestedPlan = "Choose a valid plan.";
  }

  const sourcePath = clean(body.sourcePath);
  if (!sourcePath.startsWith("/") || sourcePath.startsWith("//") || sourcePath.length > 512) {
    errors.sourcePath = "The page path is invalid.";
  }
  const cleanSourcePath = sourcePath.split(/[?#]/, 1)[0] || "/";

  const utmSource = optionalText(body.utmSource, "utmSource", 200, errors);
  const utmMedium = optionalText(body.utmMedium, "utmMedium", 200, errors);
  const utmCampaign = optionalText(body.utmCampaign, "utmCampaign", 200, errors);
  const utmContent = optionalText(body.utmContent, "utmContent", 200, errors);
  const utmTerm = optionalText(body.utmTerm, "utmTerm", 200, errors);
  const localeValue = clean(body.locale).toLowerCase();
  const locale = /^[a-z]{2}(?:-[a-z]{2})?$/.test(localeValue) ? localeValue.slice(0, 10) : "en";

  if (Object.keys(errors).length) return { ok: false, errors };

  return {
    ok: true,
    data: {
      name,
      email,
      company,
      role,
      teamSize: teamSize as EarlyAccessTeamSize,
      useCase,
      interestedPlan: (interestedPlan || null) as EarlyAccessPlan | null,
      source: "homepage",
      sourcePath: cleanSourcePath,
      referrer: safeReferrer(body.referrer),
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      locale,
    },
  };
}
