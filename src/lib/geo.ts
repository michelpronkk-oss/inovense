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

export const AUTERIM_HOME_FAQS = [
  { question: "What is Auterim?", answer: "Auterim is the operating layer between your business and the software it runs on. It finds work in the systems you already use, prepares the next move, and keeps the result traceable." },
  { question: "Do I have to build workflows?", answer: "No. You connect the systems you use and choose where to begin. Auterim recommends the right operator and keeps work within the controls you set." },
  { question: "What can happen automatically?", answer: "Safe internal work can run where your policy allows it. Sensitive external actions wait for approval, and blocked actions do not run." },
  { question: "Does Auterim replace our existing tools?", answer: "No. Your connected systems remain the source of truth. Auterim adds a governed operating layer across them." },
] as const;

export function toJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
