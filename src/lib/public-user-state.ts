"use client";

import { useEffect, useState } from "react";

export type PublicUserState = "loading" | "guest" | "registered" | "signed_in";

const APP_STATE_KEY = "auterim-os-state-v1";
const LEGACY_APP_STATE_KEY = "inovense-os-state-v1";
const ADMIN_SESSION_COOKIE = "auterim_admin_session";
const LEGACY_ADMIN_SESSION_COOKIE = "inovense_admin_session";

function hasSignedInCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((cookie) => {
    const value = cookie.trim();
    return value.startsWith(`${ADMIN_SESSION_COOKIE}=`) || value.startsWith(`${LEGACY_ADMIN_SESSION_COOKIE}=`);
  });
}

function hasRegisteredWorkspace(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(APP_STATE_KEY) ?? window.localStorage.getItem(LEGACY_APP_STATE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { onboarding?: { isComplete?: boolean } };
    return parsed?.onboarding?.isComplete === true;
  } catch {
    return false;
  }
}

export function usePublicUserState(): PublicUserState {
  const [state, setState] = useState<PublicUserState>("loading");

  useEffect(() => {
    const signedIn = hasSignedInCookie();
    if (signedIn) {
      // This effect synchronizes client-only cookie state after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState("signed_in");
      return;
    }
    setState(hasRegisteredWorkspace() ? "registered" : "guest");
  }, []);

  return state;
}
