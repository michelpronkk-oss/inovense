import type { NormalizedZendeskTicket } from "@/lib/connectors/zendesk";

export type ZendeskOperationsSignalType = "urgent_ticket" | "unresolved_high_priority" | "waiting_internal_response";

export function detectZendeskOperationsSignal(ticket: NormalizedZendeskTicket): { signalType: ZendeskOperationsSignalType; severity: "high" | "medium" } | null {
  if (["solved", "closed"].includes(ticket.status)) return null;
  const ageHours = ticket.updatedAt ? Math.max(0, (Date.now() - new Date(ticket.updatedAt).getTime()) / 3_600_000) : 0;
  if (ticket.priority === "urgent") return { signalType: "urgent_ticket", severity: "high" };
  if (ticket.priority === "high" && ageHours >= 24) return { signalType: "unresolved_high_priority", severity: "high" };
  if ((ticket.status === "pending" || ticket.status === "open") && ageHours >= 72) return { signalType: "waiting_internal_response", severity: "medium" };
  return null;
}
