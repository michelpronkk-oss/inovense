// Maps a real workflow's status onto the fixed Detect/Prepare/Approve/
// Execute/Measure loop. Pure and client-safe (no "server-only") so it can be
// shared by the /workflows page and the dashboard's "Work in progress" card
// without either re-deriving its own vocabulary.

export type WorkflowLoopStage = "Detect" | "Prepare" | "Approve" | "Execute" | "Measure";

export function loopStageForStatus(status: string): WorkflowLoopStage {
  if (["completed", "partially_completed"].includes(status)) return "Measure";
  if (status === "executing") return "Execute";
  if (["awaiting_approval", "partially_approved"].includes(status)) return "Approve";
  if (["blocked", "failed"].includes(status)) return "Execute";
  return "Prepare";
}
