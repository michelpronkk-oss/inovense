"use client";

import { openCookiePreferences } from "@/lib/cookie-consent";

export default function CookiePreferencesButton() {
  return (
    <button type="button" onClick={openCookiePreferences} className="btn btn-a" style={{ marginTop: 8 }}>
      Update your cookie preferences
    </button>
  );
}
