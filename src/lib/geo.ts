import {
  AUTERIM_DESCRIPTION,
  AUTERIM_NAME,
  AUTERIM_ORGANIZATION_ID,
  AUTERIM_URL,
  AUTERIM_WEBSITE_ID,
} from "@/lib/brand";

export { AUTERIM_DESCRIPTION, AUTERIM_NAME, AUTERIM_ORGANIZATION_ID, AUTERIM_URL, AUTERIM_WEBSITE_ID };

// Deprecated aliases retained for compatibility with existing imports.
export const INOVENSE_URL = AUTERIM_URL;
export const INOVENSE_NAME = AUTERIM_NAME;
export const INOVENSE_ORGANIZATION_ID = AUTERIM_ORGANIZATION_ID;
export const INOVENSE_WEBSITE_ID = AUTERIM_WEBSITE_ID;
export const INOVENSE_OS_DESCRIPTION =
  "Auterim understands the business first, then recommends and deploys controlled AI workforces that improve measurable outcomes.";
export const INOVENSE_DESCRIPTION = AUTERIM_DESCRIPTION;

export const AUTERIM_LANES = [
  { name: "Connect", path: "/integrations", description: "Connect the tools and business signals Auterim needs to understand your company." },
  { name: "Diagnose", path: "/answers", description: "Find where time, money, and opportunities are being lost and understand why." },
  { name: "Deploy", path: "/agents", description: "Deploy the right AI workforce with approvals, policies, and measurable outcomes." },
] as const;
export const INOVENSE_LANES = AUTERIM_LANES;

export const INOVENSE_HOME_FAQS = [
  { question: "What does Auterim do?", answer: "Auterim understands your business, finds where value is being lost, and deploys the right AI workforce with controls and measurable impact." },
  { question: "How does Auterim work?", answer: "Auterim connects to your tools, understands how the business runs, diagnoses opportunities, recommends a workforce, then measures and improves the result." },
  { question: "Who is Auterim for?", answer: "Auterim is for businesses that want AI to improve real work across revenue, operations, client flow, and other functions." },
  { question: "What makes Auterim different?", answer: "Most AI tools automate what users tell them to automate. Auterim starts by understanding the business and finding the work worth improving." },
] as const;

export function toJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
