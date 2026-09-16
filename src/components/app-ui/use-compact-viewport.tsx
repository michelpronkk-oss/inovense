"use client";

import { useEffect, useState } from "react";

/**
 * True below the width where a master-detail page can still show both columns.
 *
 * The number matches the `.split` stacking breakpoint in dashboard.css: above
 * it the list and detail sit side by side, below it the list is the primary
 * screen and the detail is presented as a sheet instead of being squeezed into
 * a second column.
 *
 * Starts false so server render and first paint match the desktop layout, then
 * corrects on mount.
 */
const COMPACT_QUERY = "(max-width: 1120px)";

export function useIsCompactViewport() {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(COMPACT_QUERY);
    const sync = () => setCompact(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return compact;
}
