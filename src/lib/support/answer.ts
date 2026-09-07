import { ROADMAP_ITEMS } from "@/lib/product/roadmap";
import { SUPPORT_HELP, findSupportHelp } from "@/lib/support/knowledge";

export type SupportAnswer = {
  answer: string;
  action?: { label: string; href: string };
  needsContact?: boolean;
};

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
export function answerSupportQuestion(question: string, states: ProductState[]): SupportAnswer {
  const normalized = question.toLowerCase();
  const roadmap = ROADMAP_ITEMS.find((item) => normalized.includes(item.name.toLowerCase()));
  if (roadmap) {
    const status = roadmap.status === "available" ? "available today" : roadmap.status === "next" ? "planned next" : "being explored";
    return { answer: `${roadmap.name} is ${status}. ${roadmap.summary}`, action: actionForHelp(roadmap.status === "available" ? "connectors" : "roadmap") };
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
