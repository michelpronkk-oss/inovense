"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { XIcon } from "@/components/dashboard/icons";

/**
 * One overlay abstraction for the authenticated product.
 *
 * Radix Dialog supplies the accessible behaviour (focus trap, Escape, focus
 * return to the trigger, aria wiring, background inertness). Everything visual
 * is Auterim's own token set in dashboard.css, so this never reads as a default
 * shadcn dialog.
 *
 * Presentation is chosen from the viewport rather than duplicated per caller:
 *   desktop / laptop : centred dialog, width driven by `size`
 *   tablet           : centred dialog, one step wider
 *   mobile           : bottom sheet pinned to the safe area
 *
 * The frame is always header / scrolling body / optional footer, so an overlay
 * is never taller than its content and never leaves a dead fixed-height region.
 */

export type OverlaySize = "sm" | "md" | "lg";

/** Mirrors the `--bp-app-mobile` breakpoint used by dashboard.css. */
const MOBILE_QUERY = "(max-width: 767px)";

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY);
    const sync = () => setMobile(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return mobile;
}

/**
 * Every product token (`--s2`, `--line`, `--text`, the radius scale) is declared
 * on `.os-root`. Radix portals to document.body by default, which would land
 * the overlay outside that scope and strip its surface and borders, so the
 * portal is anchored back into the product root.
 */
function useOverlayContainer() {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setContainer(document.querySelector<HTMLElement>(".os-root"));
  }, []);
  return container;
}

export function ResponsiveOverlay({
  open,
  onOpenChange,
  title,
  eyebrow,
  context,
  size = "md",
  footer,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Small uppercase label above the title. */
  eyebrow?: string;
  /** Secondary context line, e.g. the workspace the change applies to. */
  context?: ReactNode;
  size?: OverlaySize;
  /** Rendered in a sticky footer. Omitted entirely when there are no actions. */
  footer?: ReactNode;
  children: ReactNode;
}) {
  const mobile = useIsMobile();
  const container = useOverlayContainer();
  /* Callers mount this conditionally (`{editing && <ResponsiveOverlay .../>}`),
     so the whole tree unmounts on close and Radix never gets to restore focus.
     Capture the element that had focus when the overlay opened and return to it
     on teardown. */
  const triggerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      const trigger = triggerRef.current;
      if (trigger?.isConnected) requestAnimationFrame(() => trigger.focus());
    };
  }, []);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal container={container ?? undefined}>
        <DialogPrimitive.Overlay className="os-ov-scrim" />
        <DialogPrimitive.Content
          className="os-ov"
          data-variant={mobile ? "sheet" : "dialog"}
          data-size={size}
          /* Radix focuses the first tabbable node on open, which is the close
             control; its focus-visible ring then reads as a permanent cyan
             outline. Focus the dialog itself instead: the trap, Escape and
             focus return are unaffected, and the ring appears only once the
             user actually tabs to the control. */
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (event.currentTarget as HTMLElement | null)?.focus();
          }}
          tabIndex={-1}
        >
          <header className="os-ov-head">
            <div className="os-ov-head-text">
              {eyebrow ? <p className="os-ov-eyebrow">{eyebrow}</p> : null}
              <DialogPrimitive.Title className="os-ov-title">{title}</DialogPrimitive.Title>
              {context ? <div className="os-ov-context">{context}</div> : null}
            </div>
            <DialogPrimitive.Close className="os-ov-close" aria-label={`Close ${title}`}>
              <XIcon size={14} />
            </DialogPrimitive.Close>
          </header>

          <div className="os-ov-body">{children}</div>

          {footer ? <footer className="os-ov-foot">{footer}</footer> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * Consequential confirmations. Same frame, but the accessible role and the
 * deliberate lack of an outside-click dismissal come from Radix AlertDialog.
 */
export { ResponsiveOverlay as AppDialog };
