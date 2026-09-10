"use client";

// Single explicit contract for "this surface was launched from /onboarding
// and must hand the user back to it" - used by the onboarding wizard when it
// sends the user to /connectors, and by /connectors when deciding what
// closing/cancelling/erroring out of a connector flow should do.
//
// The sessionStorage marker is a UX breadcrumb only (which route to return
// to); it never grants access or proves entitlement. Onboarding completion
// and connector truth stay server-authoritative (os_workspaces.
// onboarding_completed_at, real OAuth callbacks).

const RETURN_STORAGE_KEY = "auterim.onboarding.return";
export const ONBOARDING_QUERY_FLAG = "onboarding";

/** True when the current /connectors visit was launched from onboarding. */
export function isOnboardingLaunch(searchParams: URLSearchParams): boolean {
  return searchParams.get(ONBOARDING_QUERY_FLAG) === "1";
}

/** Call before navigating from onboarding into a connector setup flow. */
export function markOnboardingReturn() {
  try {
    window.sessionStorage.setItem(RETURN_STORAGE_KEY, "/onboarding");
  } catch {
    // Storage may be unavailable (private mode). The onboarding=1 query flag
    // still lets /connectors behave correctly for this visit.
  }
}

/** True when this /connectors visit was launched from onboarding and hasn't returned yet. */
export function hasPendingOnboardingReturn(): boolean {
  try {
    return window.sessionStorage.getItem(RETURN_STORAGE_KEY) === "/onboarding";
  } catch {
    return false;
  }
}

export function clearOnboardingReturn() {
  try {
    window.sessionStorage.removeItem(RETURN_STORAGE_KEY);
  } catch {
    // Nothing to clean up if storage isn't available.
  }
}
