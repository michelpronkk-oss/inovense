"use client";

import type { DraftEdit } from "./types";

export function EmailDraftPreview({
  id,
  to,
  subject,
  body,
  wasEdited,
  connectorLabel,
  draftEdit,
  isSaving,
  onChangeDraft,
  onSave,
  onCancel,
}: {
  id: string;
  to: string | null;
  subject: string;
  body: string;
  wasEdited: boolean;
  connectorLabel: string;
  draftEdit: DraftEdit | undefined;
  isSaving: boolean;
  onChangeDraft: (next: DraftEdit) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  if (draftEdit) {
    return (
      <section id={id} className="approval-email" aria-label="Edit prepared email">
        <div className="approval-email-bar">
          <span className="t-eyebrow">Editing draft</span>
          <span className="approval-email-connector">{connectorLabel}</span>
        </div>
        <div className="approval-email-edit stack">
          <label className="field">
            <span className="label">Subject</span>
            <input
              className="input"
              value={draftEdit.subject}
              onChange={(event) => onChangeDraft({ ...draftEdit, subject: event.target.value })}
              disabled={isSaving}
            />
          </label>
          <label className="field">
            <span className="label">Body</span>
            <textarea
              className="input approval-email-textarea"
              value={draftEdit.body}
              onChange={(event) => onChangeDraft({ ...draftEdit, body: event.target.value })}
              disabled={isSaving}
              rows={12}
            />
          </label>
          <div className="approval-email-edit-actions">
            <button className="btn btn-ghost btn-sm" type="button" disabled={isSaving} onClick={onCancel}>Cancel</button>
            <button className="btn btn-primary btn-sm" type="button" disabled={isSaving} onClick={onSave}>{isSaving ? "Saving…" : "Save"}</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id={id} className="approval-email" aria-label="Prepared email">
      <div className="approval-email-bar">
        <span className="t-eyebrow">Prepared email</span>
        <span className="approval-email-connector">{connectorLabel}</span>
        {wasEdited && <span className="badge amber">Edited draft</span>}
      </div>
      <div className="approval-email-sheet">
        <div className="approval-email-field"><span>To</span><strong>{to || "Recipient not available"}</strong></div>
        {subject && <div className="approval-email-field"><span>Subject</span><strong>{subject}</strong></div>}
        <div className="approval-email-body">{body || "Email body not available."}</div>
      </div>
    </section>
  );
}
