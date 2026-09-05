"use client";

import { useEffect, useState } from "react";
import { appHref } from "@/lib/urls";

export type PublicUserState = "loading" | "guest" | "registered" | "signed_in";

const APP_STATE_KEY = "auterim-os-state-v1";
const LEGACY_APP_STATE_KEY = "inovense-os-state-v1";
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
    let cancelled = false;
    const setSignedOutState = () => {
      if (!cancelled) setState(hasRegisteredWorkspace() ? "registered" : "guest");
    };

    // Auth cookies can be HttpOnly and scoped to app.auterim.com. Ask the app
    // host directly instead of inferring state from marketing-site storage.
    void fetch(appHref("/api/auth/status"), { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not read session state.");
        return response.json() as Promise<{ authenticated?: boolean }>;
      })
      .then((result) => {
        if (!cancelled) setState(result.authenticated ? "signed_in" : hasRegisteredWorkspace() ? "registered" : "guest");
      })
      .catch(setSignedOutState);

    return () => { cancelled = true; };
  }, []);

  return state;
}
