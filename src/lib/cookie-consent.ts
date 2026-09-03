export type ConsentValue = "accepted" | "declined";

const STORAGE_KEY = "auterim_cookie_consent";
const CONSENT_EVENT = "auterim-consent-change";
const OPEN_PREFERENCES_EVENT = "auterim-open-cookie-preferences";

export function getStoredConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "accepted" || value === "declined" ? value : null;
  } catch {
    return null;
  }
}

export function setStoredConsent(value: ConsentValue) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // storage quota or private mode — the choice still applies for this session
  }
  window.dispatchEvent(new CustomEvent<ConsentValue>(CONSENT_EVENT, { detail: value }));
}

export function onConsentChange(callback: (value: ConsentValue) => void) {
  const handler = (event: Event) => callback((event as CustomEvent<ConsentValue>).detail);
  window.addEventListener(CONSENT_EVENT, handler);
  return () => window.removeEventListener(CONSENT_EVENT, handler);
}

// Lets any page re-open the banner to change a prior choice (footer link,
// Cookie Policy page) without needing to clear storage manually.
export function openCookiePreferences() {
  window.dispatchEvent(new Event(OPEN_PREFERENCES_EVENT));
}

export function onOpenPreferencesRequest(callback: () => void) {
  window.addEventListener(OPEN_PREFERENCES_EVENT, callback);
  return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, callback);
}
