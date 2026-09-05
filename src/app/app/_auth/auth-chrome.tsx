import Link from "next/link";

/**
 * Shared presentational chrome for the /app auth surface (sign in, create
 * account, forgot/reset password, invite acceptance). Pulls the real
 * Auterim mark used on the homepage header/footer instead of the
 * placeholder glyph the auth screens used to draw inline.
 */

export function AuthBackdrop() {
  return <div className="auth-backdrop" aria-hidden="true" />;
}

export function AuthBrand() {
  return (
    <Link href="/" className="auth-brand" aria-label="Auterim home">
      <img src="/brand/auterim-mark-live.svg" width={18} height={18} alt="" />
      <span>Auterim</span>
    </Link>
  );
}

export function AuthCardBadge() {
  return (
    <div className="auth-card-badge" aria-hidden="true">
      <img src="/brand/auterim-mark-live.svg" width={14} height={14} alt="" />
    </div>
  );
}
