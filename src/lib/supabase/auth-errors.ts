type AuthErrorLike = {
  message?: string | null;
  code?: string | null;
  status?: number | null;
  name?: string | null;
};

/**
 * Safe, user-facing authentication errors. Provider messages and transport
 * errors are deliberately not rendered verbatim: they can expose provider
 * internals and make a temporary configuration problem look like a user
 * mistake.
 */
export function authErrorMessage(error: AuthErrorLike | unknown, action: "signup" | "signin" | "reset" | "resend" | "callback" = "signup"): string {
  const value = (error ?? {}) as AuthErrorLike;
  const message = `${value.message ?? ""}`.toLowerCase();
  const code = `${value.code ?? ""}`.toLowerCase();

  if (
    value.name === "SupabaseBrowserConfigurationError" ||
    code.includes("configuration")
  ) {
    return action === "signin"
      ? "Sign-in is temporarily unavailable. Please try again shortly."
      : "Account creation is temporarily unavailable. Please try again shortly.";
  }

  if (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("networkerror") ||
    message.includes("load failed")
  ) {
    return "We couldn’t reach the authentication service. Please try again in a moment.";
  }

  if (
    code.includes("over_email_send_rate_limit") ||
    code.includes("email_rate_limit") ||
    message.includes("email rate limit") ||
    message.includes("too many requests")
  ) {
    return "Too many verification emails were requested recently. Please wait a few minutes before trying again.";
  }

  if (
    code.includes("user_already_exists") ||
    message.includes("already registered") ||
    message.includes("already exists") ||
    message.includes("user already")
  ) {
    return "An account with this email may already exist. Try signing in instead.";
  }

  if (message.includes("invalid login credentials")) {
    return "That email or password is incorrect.";
  }

  if (message.includes("email not confirmed")) {
    return "Confirm your email address before signing in. Check your inbox for the verification link.";
  }

  if (action === "callback") {
    return "This link is invalid or has expired. Request a new email and try again.";
  }

  if (action === "reset") return "We couldn’t send that reset link. Please try again in a moment.";
  if (action === "resend") return "We couldn’t send another verification email yet. Please try again in a few minutes.";
  if (action === "signin") return "We couldn’t sign you in. Please try again in a moment.";
  return "We couldn’t create your account. Please try again in a moment.";
}

/** Contains only safe-to-log diagnostic metadata, never a token/key/email. */
export function authErrorDiagnostics(error: AuthErrorLike | unknown) {
  const value = (error ?? {}) as AuthErrorLike;
  return {
    category: value.name === "SupabaseBrowserConfigurationError" ? "configuration" : "provider_or_network",
    code: typeof value.code === "string" ? value.code : "unknown",
    status: typeof value.status === "number" ? value.status : null,
  };
}
