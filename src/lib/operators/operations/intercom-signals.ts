import type { NormalizedIntercomConversation } from "@/lib/connectors/intercom";

export type IntercomOperationsSignal = "urgent_conversation" | "unanswered_request" | "stale_follow_up";

/** Read-only, high-signal operations cues. This helper never prepares a write. */
export function detectIntercomOperationsSignal(conversation: NormalizedIntercomConversation): IntercomOperationsSignal | null {
  if (["closed", "resolved"].includes(conversation.state)) return null;
  const ageHours = conversation.updatedAt ? Math.max(0, (Date.now() - new Date(conversation.updatedAt).getTime()) / 3_600_000) : 0;
  const text = conversation.parts.at(-1)?.preview?.toLowerCase() ?? conversation.subjectOrPreview?.toLowerCase() ?? "";
  if (conversation.priority || /urgent|critical|outage|blocked|escalat/.test(text)) return "urgent_conversation";
  if (!conversation.assignedAdminId && ageHours >= 12) return "unanswered_request";
  if (ageHours >= 48) return "stale_follow_up";
  return null;
}
