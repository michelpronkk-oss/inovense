"use client";

import { useEffect } from "react";
import {
  ATTR_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  classifySource,
  extractReferrerHost,
  generateSessionKey,
  sanitizePath,
  type AttributionSnapshot,
} from "@/lib/attribution";

export default function TrafficAttributionTracker() {
  useEffect(() => {
    // Wrapped in try/catch — must never throw or affect the page.
    try {
      const existingSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
      const currentPath = sanitizePath(window.location.pathname);

      if (!existingSession) {
        // ── New session ─────────────────────────────────────────────────
        const sessionKey = generateSessionKey();
        const referrer = document.referrer || null;
        const referrerHost = extractReferrerHost(referrer);

        const params = new URLSearchParams(window.location.search);
        const utmSource = params.get("utm_source") || null;
        const utmMedium = params.get("utm_medium") || null;
        const utmCampaign = params.get("utm_campaign") || null;
        const utmContent = params.get("utm_content") || null;
        const utmTerm = params.get("utm_term") || null;

        const currentSource = classifySource(referrerHost, utmSource, utmMedium);

        // Read existing localStorage snapshot to preserve first-touch.
        let existing: AttributionSnapshot | null = null;
        try {
          const raw = localStorage.getItem(ATTR_STORAGE_KEY);
          if (raw) existing = JSON.parse(raw) as AttributionSnapshot;
        } catch {
          // ignore corrupted storage
        }

        const firstTouchSource = existing?.firstTouchSource ?? currentSource;
        const landingPath = existing?.landingPath ?? currentPath;

        const snapshot: AttributionSnapshot = {
          sessionKey,
          landingPath,
          referrerHost,
          utmSource,
          utmMedium,
          utmCampaign,
          utmContent,
          utmTerm,
          firstTouchSource,
          lastTouchSource: currentSource,
          capturedAt: new Date().toISOString(),
        };

        try {
          localStorage.setItem(ATTR_STORAGE_KEY, JSON.stringify(snapshot));
        } catch {
          // storage quota or private mode
        }

        sessionStorage.setItem(SESSION_STORAGE_KEY, sessionKey);

        // Fire beacon — keepalive so it survives page navigation.
        fetch("/api/traffic/hit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_key: sessionKey,
            landing_path: currentPath,
            last_path: currentPath,
            referrer_host: referrerHost,
            utm_source: utmSource,
            utm_medium: utmMedium,
            utm_campaign: utmCampaign,
            utm_content: utmContent,
            utm_term: utmTerm,
            first_touch_source: firstTouchSource,
            last_touch_source: currentSource,
            is_new_session: true,
          }),
          keepalive: true,
        }).catch(() => {});
      } else {
        // ── Existing session page navigation ────────────────────────────
        fetch("/api/traffic/hit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_key: existingSession,
            last_path: currentPath,
            is_new_session: false,
          }),
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Never surface tracker errors to the user.
    }
  }, []);

  return null;
}
