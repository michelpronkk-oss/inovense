"use client";

import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Confirmation for consequential, hard-to-undo actions (bulk approve, reject).
 * Shares the exact visual frame as `ResponsiveOverlay` (`.os-ov-*` tokens in
 * dashboard.css) so it never reads as a second, unrelated overlay system.
 * Radix AlertDialog supplies the accessible behaviour that matters here and
 * that `window.confirm` cannot: a labelled role, focus trapped on the
 * confirming action, Escape support, and no dismissal from an outside click
 * (a consequential choice should be answered, not brushed past).
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  tone = "default",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  tone?: "default" | "danger";
}) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setContainer(document.querySelector<HTMLElement>(".os-root"));
  }, []);

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal container={container ?? undefined}>
        <AlertDialogPrimitive.Overlay className="os-ov-scrim" />
        <AlertDialogPrimitive.Content className="os-ov os-ov-confirm" data-variant="dialog" data-size="sm">
          <header className="os-ov-head">
            <div className="os-ov-head-text">
              <AlertDialogPrimitive.Title className="os-ov-title">{title}</AlertDialogPrimitive.Title>
              <AlertDialogPrimitive.Description className="os-ov-context">{description}</AlertDialogPrimitive.Description>
            </div>
          </header>
          <footer className="os-ov-foot">
            <AlertDialogPrimitive.Cancel className="btn btn-ghost btn-sm">{cancelLabel}</AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action className={`btn btn-sm ${tone === "danger" ? "btn-danger" : "btn-primary"}`} onClick={onConfirm}>
              {confirmLabel}
            </AlertDialogPrimitive.Action>
          </footer>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
