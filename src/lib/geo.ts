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
  { question: "What is an AI operator?", answer: "An AI operator is a role with a defined job, company context, connected tools and approval boundaries. It prepares and runs work rather than simply answering prompts." },
  { question: "How is Auterim different from an AI chatbot?", answer: "Chatbots wait for an instruction. Auterim starts with company context, recommends the right operators and lets them work across the systems your team already uses." },
  { question: "Can Auterim act without approval?", answer: "Only within the policies you define. Operators can prepare work automatically, while sensitive actions wait for a named approver or remain blocked." },
  { question: "Can I preview Auterim before connecting tools?", answer: "Yes. Start with your website to see an operating profile and recommended workforce before you connect systems or enable external actions." },
] as const;

export function toJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
