import { ROADMAP_ITEMS } from "@/lib/product/roadmap";
import type { InactionReason } from "@/lib/support/diagnosis";
import { SUPPORT_HELP, findSupportHelp } from "@/lib/support/knowledge";

export type SupportAnswer = {
  answer: string;
  action?: { label: string; href: string };
  needsContact?: boolean;
  /** Machine-readable codes behind an inaction answer. Never customer content. */
  reasonCodes?: string[];
};

/** True when the customer is asking why Auterim did not do something. */
export function isInactionQuestion(question: string): boolean {
  const normalized = question.toLowerCase();
  return /why (did ?n.?t|did not|has ?n.?t|has not|is ?n.?t|was ?n.?t|no)/.test(normalized)
    || /nothing (happened|has happened|is happening)|no action|didn.?t (send|do|run|act|create)|not (sending|running|acting|doing anything)|stuck|stopped working|no approvals?/.test(normalized);
}

type ProductState = { operatorName: string; label: string; description: string; nextAction: { label: string; href: string } | null };

function actionForHelp(id: string) {
  const item = SUPPORT_HELP.find((entry) => entry.id === id);
  return item ? { label: item.title, href: item.href } : undefined;
}

/**
 * Deliberately bounded assistant: it receives only safe, verified product-state
 * summaries and produces factual guidance. It does not act, change workspace
 * state, or inspect message, connector credential, or customer data.
 */
export function answerSupportQuestion(question: string, states: ProductState[], inactionReasons?: InactionReason[]): SupportAnswer {
  const normalized = question.toLowerCase();
  // "Why didn't Auterim act?" is answered from verified workspace state, in
  // priority order, as reason codes plus plain copy. No stack traces, no
  // provider payloads, no business content.
  if (inactionReasons?.length && isInactionQuestion(question)) {
    const primary = inactionReasons[0];
    const secondary = inactionReasons.slice(1, 3);
    const answer = [primary.message, ...secondary.map((reason) => reason.message)].join(" ");
    return { answer, action: primary.action, reasonCodes: inactionReasons.slice(0, 3).map((reason) => reason.code) };
  }
  const roadmap = ROADMAP_ITEMS.find((item) => normalized.includes(item.name.toLowerCase()));
  if (roadmap) {
    const status = roadmap.status === "available" ? "available today" : roadmap.status === "next" ? "planned next" : "being explored";
    return { answer: `${roadmap.name} is ${status}. ${roadmap.summary}`, action: actionForHelp(roadmap.status === "available" ? "connectors" : "roadmap") };
  }
  if (normalized.includes("teams")) {
    return {
      answer: "Microsoft Teams uses the same Microsoft sign-in as Microsoft 365, but it needs its own Teams permissions before it can be used. Until those are granted, Teams shows as needing permission even when Microsoft mail is healthy. When Teams is connected, Auterim can monitor a selected Teams channel and send Teams messages only after approval. Turning Teams off leaves Microsoft 365 mail and calendar access untouched.",
      action: actionForHelp("connectors"),
    };
  }
  if (normalized.includes("salesforce")) {
    return { answer: "Salesforce can provide CRM context when connected. Salesforce writes are not enabled, so Auterim will not create or update Salesforce records from this workspace.", action: actionForHelp("connectors") };
  }
  const match = states.find((state) => normalized.includes(state.operatorName.replace(" Operator", "").toLowerCase()) || normalized.includes(state.operatorName.toLowerCase()));
  if (match || /operator.*(ready|setup|activate)|not ready/.test(normalized)) {
    const state = match ?? states[0];
    if (state) return { answer: `${state.operatorName}: ${state.label}. ${state.description}`, action: state.nextAction ?? actionForHelp("operators") };
  }
  if (/plan|billing|invoice|subscription|upgrade/.test(normalized)) {
    return { answer: "Your plan and billing status are available in Plans & billing. Operator availability is checked there before continuous work can start.", action: actionForHelp("plans") };
  }
  if (/approval|policy|outbound|send/.test(normalized)) {
    return { answer: "Auterim prepares work and keeps consequential outbound actions under approval. Review the item and its context before approving it.", action: actionForHelp("approvals") };
  }
  const suggested = findSupportHelp(question)[0];
  if (suggested) return { answer: `${suggested.summary}`, action: { label: suggested.title, href: suggested.href } };
  return { answer: "I couldn't verify that from your current workspace state. Send a support request and our team will follow up.", needsContact: true };
}
