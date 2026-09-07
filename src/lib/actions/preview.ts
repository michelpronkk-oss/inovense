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
  if (intent.actionType === "create_asana_task") {
    return { label: "Create Asana task", fields: [{ label: "Project", value: text(intent.input.projectName ?? intent.input.projectId) }, { label: "Title", value: text(intent.input.name) }, { label: "Due", value: text(intent.input.dueOn) }], bodyPreview: previewBody(intent.input.notes) };
  }
  if (intent.actionType === "update_asana_task") {
    return { label: "Update Asana task", fields: [{ label: "Task", value: text(intent.input.taskId) }, { label: "Name", value: text(intent.input.name) }, { label: "Due", value: text(intent.input.dueOn) }, { label: "Completed", value: text(intent.input.completed) }] };
  }
  if (intent.actionType === "add_asana_comment") {
    return { label: "Add Asana comment", fields: [{ label: "Task", value: text(intent.input.taskId) }], bodyPreview: previewBody(intent.input.text) };
  }
  if (intent.actionType === "create_jira_issue") {
    return { label: "Create Jira issue", fields: [{ label: "Project", value: text(intent.input.projectName ?? intent.input.projectKey ?? intent.input.projectId) }, { label: "Issue type", value: text(intent.input.issueTypeName ?? intent.input.issueTypeId) }, { label: "Summary", value: text(intent.input.summary) }, { label: "Due", value: text(intent.input.dueDate) }], bodyPreview: previewBody(intent.input.description) };
  }
  if (intent.actionType === "update_jira_issue") {
    return { label: "Update Jira issue", fields: [{ label: "Issue", value: text(intent.input.issueKey) }, { label: "Summary", value: text(intent.input.summary) }, { label: "Due", value: text(intent.input.dueDate) }, { label: "Priority", value: text(intent.input.priorityName ?? intent.input.priorityId) }] };
  }
  if (intent.actionType === "add_jira_comment") {
    return { label: "Add Jira comment", fields: [{ label: "Issue", value: text(intent.input.issueKey) }], bodyPreview: previewBody(intent.input.text) };
  }
  if (intent.actionType === "reply_zendesk_ticket") {
    return { label: "Reply to Zendesk ticket", fields: [{ label: "Ticket", value: text(intent.input.ticketId) }, { label: "Subject", value: text(intent.input.subject) }], bodyPreview: previewBody(intent.input.body) };
  }
  if (intent.actionType === "add_zendesk_internal_note") {
    return { label: "Add Zendesk internal note", fields: [{ label: "Ticket", value: text(intent.input.ticketId) }], bodyPreview: previewBody(intent.input.body) };
  }
  if (intent.actionType === "update_zendesk_ticket") {
    return { label: "Update Zendesk ticket", fields: [{ label: "Ticket", value: text(intent.input.ticketId) }, { label: "Status", value: text(intent.input.status) }, { label: "Priority", value: text(intent.input.priority) }, { label: "Assignee", value: text(intent.input.assigneeId) }] };
  }
  if (intent.actionType === "reply_intercom_conversation") {
    return { label: "Reply to Intercom conversation", fields: [{ label: "Conversation", value: text(intent.input.conversationId) }], bodyPreview: previewBody(intent.input.body) };
  }
  if (intent.actionType === "update_intercom_conversation") {
    return { label: "Update Intercom conversation", fields: [{ label: "Conversation", value: text(intent.input.conversationId) }, { label: "State", value: text(intent.input.status) }, { label: "Assignee", value: text(intent.input.adminId) }] };
  }
  return {
    label: intent.title,
    fields: Object.entries(intent.input).slice(0, 4).map(([label, value]) => ({ label, value: text(value) })),
    bodyPreview: previewBody(intent.summary),
  };
}
