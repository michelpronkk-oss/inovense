"use client";

import { useEffect, useRef, useState } from "react";
import { deleteEarlyAccessRequest } from "./actions";

export function DeleteEarlyAccessRequestForm({
  requestId,
  email,
  acceptedWorkspaceExists,
}: {
  requestId: string;
  email: string;
  acceptedWorkspaceExists: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (confirming && !dialog.open) {
      dialog.showModal();
      cancelRef.current?.focus();
    } else if (!confirming && dialog.open) {
      dialog.close();
      triggerRef.current?.focus();
    }
  }, [confirming]);

  return <>
    <section className="ea-danger-zone" aria-labelledby="ea-danger-zone-title">
      <div>
        <div className="admin-eyebrow">Danger zone</div>
        <h2 id="ea-danger-zone-title">Delete request</h2>
        <p>Permanently remove this Early Access record and its invite history.</p>
        {acceptedWorkspaceExists && <p className="ea-danger-note">This accepted request is linked to a workspace. Deleting this record will leave that workspace and its membership untouched.</p>}
      </div>
      <button ref={triggerRef} type="button" className="ea-delete-trigger" onClick={() => setConfirming(true)}>
        Delete request
      </button>
    </section>

    <dialog
      ref={dialogRef}
      className="ea-delete-dialog"
      aria-labelledby="ea-delete-dialog-title"
      aria-describedby="ea-delete-dialog-copy"
      onCancel={(event) => { event.preventDefault(); setConfirming(false); }}
      onClose={() => setConfirming(false)}
    >
      <div className="admin-eyebrow">Permanent action</div>
      <h2 id="ea-delete-dialog-title">Delete {email}?</h2>
      <p id="ea-delete-dialog-copy">This removes the Early Access request and its invite history. It cannot be undone. Existing Auterim accounts, workspaces, memberships, billing, and trials are not deleted.</p>
      <div className="ea-delete-dialog-actions">
        <button ref={cancelRef} type="button" className="ea-button-secondary" onClick={() => setConfirming(false)}>Cancel</button>
        <form action={deleteEarlyAccessRequest}>
          <input type="hidden" name="id" value={requestId} />
          <button type="submit" className="ea-delete-confirm">Delete permanently</button>
        </form>
      </div>
    </dialog>
  </>;
}
