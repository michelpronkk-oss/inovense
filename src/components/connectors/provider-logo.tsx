// Single shared source of provider brand marks for connector cards across
// onboarding and /connectors. Every mark below is an original, locally
// defined inline SVG drawn in each provider's real public brand color(s) -
// no remote asset is fetched at render time, and no logo is distorted
// (each mark ships its own square viewBox and is scaled uniformly).
//
// Keyed by canonical connector key (matches src/lib/connectors/registry.ts
// connectorKey, e.g. "gmail", "microsoft_teams") rather than a display-name
// string, so lookups can't silently miss on a copy change.

import type { CSSProperties, ReactNode } from "react";

export type ProviderKey =
  | "gmail"
  | "microsoft"
  | "microsoft_teams"
  | "google_drive"
  | "hubspot"
  | "trello"
  | "asana"
  | "jira"
  | "zendesk"
  | "intercom"
  | "slack"
  | "salesforce";

export const PROVIDER_LABELS: Record<ProviderKey, string> = {
  gmail: "Gmail",
  microsoft: "Microsoft 365",
  microsoft_teams: "Microsoft Teams",
  google_drive: "Google Drive",
  hubspot: "HubSpot",
  trello: "Trello",
  asana: "Asana",
  jira: "Jira",
  zendesk: "Zendesk",
  intercom: "Intercom",
  slack: "Slack",
  salesforce: "Salesforce",
};

const MARKS: Record<ProviderKey, ReactNode> = {
  gmail: (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="2.2" fill="#FFFFFF" />
      <path d="M2.4 6.3L12 13.4l9.6-7.1" stroke="#EA4335" strokeWidth="2.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  microsoft: (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden>
      <rect x="2" y="2" width="9.3" height="9.3" fill="#F25022" />
      <rect x="12.7" y="2" width="9.3" height="9.3" fill="#7FBA00" />
      <rect x="2" y="12.7" width="9.3" height="9.3" fill="#00A4EF" />
      <rect x="12.7" y="12.7" width="9.3" height="9.3" fill="#FFB900" />
    </svg>
  ),
  microsoft_teams: (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden>
      <rect x="1" y="1" width="22" height="22" rx="5.5" fill="#5059C9" />
      <circle cx="14.6" cy="8.1" r="2.5" fill="#FFFFFF" />
      <path d="M9.1 12.3c2.9 0 5.35 2.1 5.35 5.35v2a1 1 0 01-1 1H9.9a1 1 0 01-1-1v-1.15c0-.22-.18-.4-.4-.4H6.05a1 1 0 01-1-1v-1.6c0-1.78 1.95-3.2 4.05-3.2z" fill="#FFFFFF" />
    </svg>
  ),
  google_drive: (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden>
      <path d="M12 3L15.2 9 12 9 8.8 9Z" fill="#FFCD40" />
      <path d="M8.8 9L12 9 12 20 3 20Z" fill="#0F9D58" />
      <path d="M15.2 9L21 20 12 20 12 9Z" fill="#4285F4" />
    </svg>
  ),
  hubspot: (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" aria-hidden>
      <circle cx="9.6" cy="14" r="6" stroke="#FF7A59" strokeWidth="2.4" />
      <line x1="13.9" y1="9.7" x2="17.6" y2="6" stroke="#FF7A59" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="18.4" cy="5.2" r="2.7" fill="#FF7A59" />
    </svg>
  ),
  trello: (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="4.2" fill="#0079BF" />
      <rect x="5.4" y="5.4" width="6" height="11" rx="1.3" fill="#FFFFFF" />
      <rect x="13.6" y="5.4" width="6" height="7" rx="1.3" fill="#FFFFFF" />
    </svg>
  ),
  asana: (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="#F06A6A" aria-hidden>
      <circle cx="12" cy="5.6" r="3.5" />
      <circle cx="5.8" cy="16.2" r="3.5" />
      <circle cx="18.2" cy="16.2" r="3.5" />
    </svg>
  ),
  jira: (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden>
      <rect x="7.2" y="3.2" width="9.6" height="9.6" rx="2.2" transform="rotate(45 12 8)" fill="#0052CC" />
      <rect x="3.6" y="8.6" width="8" height="8" rx="1.8" transform="rotate(45 7.6 12.6)" fill="#2684FF" opacity="0.85" />
      <rect x="10.4" y="8.6" width="8" height="8" rx="1.8" transform="rotate(45 14.4 12.6)" fill="#2684FF" opacity="0.6" />
    </svg>
  ),
  zendesk: (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden>
      <path d="M3 6.2a2.2 2.2 0 012.2-2.2h9.6a2.2 2.2 0 012.2 2.2v6.2a2.2 2.2 0 01-2.2 2.2H9.4l-4.9 4.7v-4.7H5.2A2.2 2.2 0 013 12.4z" fill="#03363D" />
    </svg>
  ),
  intercom: (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden>
      <rect x="2.4" y="3" width="19.2" height="14" rx="4" fill="#1F8DED" />
      <path d="M9.4 17l-3.2 4.2V17z" fill="#1F8DED" />
      <circle cx="8.3" cy="10" r="1.5" fill="#FFFFFF" />
      <circle cx="12" cy="10" r="1.5" fill="#FFFFFF" />
      <circle cx="15.7" cy="10" r="1.5" fill="#FFFFFF" />
    </svg>
  ),
  slack: (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden>
      <path d="M9 2.6a2 2 0 114 0V8H9z" fill="#36C5F0" />
      <circle cx="9" cy="8" r="2" fill="#36C5F0" />
      <path d="M16 9a2 2 0 010 4h-5.5V9z" fill="#2EB67D" />
      <circle cx="16" cy="9" r="2" fill="#2EB67D" />
      <path d="M15 21.4a2 2 0 11-4 0V16H15z" fill="#ECB22E" />
      <circle cx="15" cy="16" r="2" fill="#ECB22E" />
      <path d="M8 15a2 2 0 010-4h5.5v4z" fill="#E01E5A" />
      <circle cx="8" cy="15" r="2" fill="#E01E5A" />
    </svg>
  ),
  salesforce: (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden>
      <path d="M9.6 6.7a4.1 4.1 0 017 2.8 3.5 3.5 0 013.6 3.5 3.5 3.5 0 01-3.5 3.5H6.2a3.8 3.8 0 01-.6-7.5 4.1 4.1 0 014-2.3z" fill="#00A1E0" />
    </svg>
  ),
};

/** True when connectorKey has a real drawn brand mark (not just letter/color). */
export function hasProviderLogo(connectorKey: string): connectorKey is ProviderKey {
  return Object.prototype.hasOwnProperty.call(MARKS, connectorKey);
}

export function ProviderLogo({
  connectorKey,
  size = 22,
  box = 32,
  radius = 8,
  name,
  fallbackLetter,
  fallbackColor,
  className,
  style,
}: {
  connectorKey: string;
  /** Visible logo size in px (20-24 recommended). */
  size?: number;
  /** Fixed square container size in px. */
  box?: number;
  radius?: number;
  /** Accessible name override; defaults to the known provider label. */
  name?: string;
  /** Rendered only when no real mark exists for connectorKey. */
  fallbackLetter?: string;
  fallbackColor?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const known = hasProviderLogo(connectorKey);
  const label = name ?? (known ? PROVIDER_LABELS[connectorKey] : connectorKey);

  return (
    <span
      className={`provider-logo${className ? ` ${className}` : ""}`}
      role="img"
      aria-label={label}
      style={{
        width: box,
        height: box,
        minWidth: box,
        borderRadius: radius,
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        background: "rgba(255,255,255,.06)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,.06)",
        flex: "none",
        ...style,
      }}
    >
      {known ? (
        <span style={{ width: size, height: size, display: "block" }}>{MARKS[connectorKey]}</span>
      ) : (
        <span style={{ color: fallbackColor ?? "var(--text-dim)", fontSize: Math.round(size * 0.45), fontFamily: "var(--font-mono)", fontWeight: 700 }}>
          {fallbackLetter ?? label.slice(0, 2)}
        </span>
      )}
    </span>
  );
}
