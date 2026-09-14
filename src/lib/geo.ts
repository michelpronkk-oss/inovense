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
  "Auterim is the operating layer between a business and the software it runs on. It connects existing systems, finds relevant work, and moves approved actions under company policy.";
export const INOVENSE_DESCRIPTION = AUTERIM_DESCRIPTION;

export const AUTERIM_LANES = [
  { name: "Connect", path: "/connectors", description: "Connect the tools and business signals Auterim needs to understand your company." },
  { name: "Understand and diagnose", path: "/how-it-works", description: "Find work that needs attention and understand the context around it." },
  { name: "Deploy", path: "/operators", description: "Route work to specialized Operators with policies, approvals, and outcome tracking." },
] as const;
export const INOVENSE_LANES = AUTERIM_LANES;

export const AUTERIM_HOME_FAQS = [
  { question: "What is Auterim?", answer: "Auterim is the operating layer between a business and the software it runs on. It finds work in connected systems, routes it to a specialized Operator, and tracks what happens next." },
  { question: "How is Auterim different from a chatbot or workflow builder?", answer: "A chatbot waits for a prompt, and a workflow builder waits for someone to define the process. Auterim is designed to notice relevant work in connected systems and prepare a policy-controlled next step." },
  { question: "What are Auterim Operators?", answer: "Operators are specialized roles for revenue, client flow, operations, and support. Each one watches approved context, prepares work for its area, and follows the permissions and policies set for the workspace." },
  { question: "What can happen automatically?", answer: "Actions allowed by workspace policy can run through supported connected systems. Actions that require approval pause for review, and blocked actions do not run." },
  { question: "Does Auterim replace our existing tools?", answer: "No. Your connected systems remain the systems of record. Auterim adds an operating layer across the tools your team already uses." },
  { question: "How does Early Access work?", answer: "Submit a request for review. A request does not create an account or start a trial; invited workspaces choose when to begin the three-day trial." },
] as const;

export function toJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
