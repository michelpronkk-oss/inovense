import type { ActionIntent, ActionPreview } from "@/lib/actions/types";

function text(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "-";
}

function previewBody(value: unknown, max = 420): string | null {
  const body = text(value);
  if (body === "-") return null;
  return body.length > max ? `${body.slice(0, max)}...` : body;
}

export function renderActionPreview(intent: ActionIntent): ActionPreview {
  if (intent.actionType === "create_task") {
    return {
      label: "Create Trello card",
      fields: [
        { label: "Board", value: text(intent.input.boardName) },
        { label: "List", value: text(intent.input.listName) },
        { label: "Title", value: text(intent.input.name) },
        { label: "Due", value: text(intent.input.due) },
      ],
      bodyPreview: previewBody(intent.input.description),
    };
  }
  if (intent.actionType === "move_task") {
    return {
      label: "Move Trello card",
      fields: [
        { label: "Card", value: text(intent.input.cardId) },
        { label: "Target list", value: text(intent.input.listName ?? intent.input.listId) },
      ],
    };
  }
  if (intent.actionType === "add_task_comment") {
    return {
      label: "Add Trello card comment",
      fields: [{ label: "Card", value: text(intent.input.cardId) }],
      bodyPreview: previewBody(intent.input.text),
    };
  }
  return {
    label: intent.title,
    fields: Object.entries(intent.input).slice(0, 4).map(([label, value]) => ({ label, value: text(value) })),
    bodyPreview: previewBody(intent.summary),
  };
}
