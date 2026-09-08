import type { NormalizedGoogleDriveFile } from "@/lib/connectors/google-drive";
import type { NormalizedZendeskTicket } from "@/lib/connectors/zendesk";
import type { SafeTeamsMessage } from "@/lib/connectors/microsoft-teams";
import { normalizeTeamsMessageToSignalEvent } from "@/lib/signals/teams";
import type { SignalEvent } from "@/lib/signals/types";

/** Provider adapters only map safe, bounded provider facts to signal input. */
export type ProjectTaskSignalInput = {
  connectorKey: "trello" | "asana" | "jira";
  id: string;
  title: string;
  status?: string | null;
  priority?: string | null;
  dueAt?: string | null;
  updatedAt?: string | null;
  url?: string | null;
  isBlocked?: boolean;
};

export function normalizeTeamsSignal(input: {
  workspaceId: string;
  message: SafeTeamsMessage;
  teamName?: string | null;
  channelName?: string | null;
  channelMembershipType?: string | null;
}): SignalEvent {
  return {
    ...normalizeTeamsMessageToSignalEvent(input),
    connectorKey: "microsoft_teams",
    provider: "microsoft_teams",
    occurredAt: input.message.occurredAt,
    metadata: { ...normalizeTeamsMessageToSignalEvent(input).metadata, occurredAt: input.message.occurredAt },
  };
}

export function normalizeZendeskSignal(input: { workspaceId: string; ticket: NormalizedZendeskTicket }): SignalEvent {
  const { ticket } = input;
  return {
    workspaceId: input.workspaceId,
    connectorKey: "zendesk",
    provider: "zendesk",
    source: "zendesk",
    sourceType: "support_ticket",
    eventType: "ticket.updated",
    sourceId: ticket.ticketId,
    occurredAt: ticket.updatedAt || ticket.createdAt,
    subject: ticket.subject,
    snippet: ticket.commentPreview || ticket.subject,
    rawRef: ticket.url,
    metadata: {
      status: ticket.status,
      priority: ticket.priority,
      updatedAt: ticket.updatedAt,
      requesterId: ticket.requesterId,
      organizationId: ticket.organizationId,
      tags: ticket.tags.slice(0, 20),
    },
  };
}

export function normalizeDriveSignal(input: { workspaceId: string; file: NormalizedGoogleDriveFile }): SignalEvent {
  const { file } = input;
  return {
    workspaceId: input.workspaceId,
    connectorKey: "google_drive",
    provider: "google_drive",
    source: "google_drive",
    sourceType: "document",
    eventType: "file.modified",
    sourceId: file.fileId,
    sourceParentId: file.folderId,
    occurredAt: file.modifiedAt,
    subject: file.name,
    snippet: file.textPreview?.slice(0, 320) || file.name,
    rawRef: file.webViewUrl,
    metadata: {
      updatedAt: file.modifiedAt,
      mimeType: file.mimeType,
      folderId: file.folderId,
      sourceScope: file.sourceScope,
    },
  };
}

export function normalizeProjectTaskSignal(input: { workspaceId: string; task: ProjectTaskSignalInput }): SignalEvent {
  const { task } = input;
  return {
    workspaceId: input.workspaceId,
    connectorKey: task.connectorKey,
    provider: task.connectorKey,
    source: task.connectorKey,
    sourceType: "project_task",
    eventType: "task.updated",
    sourceId: task.id,
    occurredAt: task.updatedAt || task.dueAt,
    subject: task.title,
    snippet: task.isBlocked ? `${task.title} is blocked` : task.title,
    rawRef: task.url || null,
    metadata: { status: task.status, priority: task.priority, dueAt: task.dueAt, updatedAt: task.updatedAt, isBlocked: task.isBlocked === true },
  };
}
