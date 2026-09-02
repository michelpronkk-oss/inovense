import { AUTERIM_ADMIN_URL, AUTERIM_APP_URL, AUTERIM_MARKETING_URL } from "@/lib/brand";

const PUBLIC_URLS = [
  ["NEXT_PUBLIC_SITE_URL", AUTERIM_MARKETING_URL],
  ["NEXT_PUBLIC_MARKETING_URL", AUTERIM_MARKETING_URL],
  ["NEXT_PUBLIC_APP_URL", AUTERIM_APP_URL],
  ["NEXT_PUBLIC_ADMIN_URL", AUTERIM_ADMIN_URL],
] as const;

function isLocalUrl(value: string): boolean {
  try {
    return ["localhost", "127.0.0.1", "::1"].includes(new URL(value).hostname);
  } catch {
    return false;
  }
}

function isAuterimUrl(value: string): boolean {
  try {
    return new URL(value).hostname.endsWith("auterim.com");
  } catch {
    return false;
  }
}

/** Returns safe configuration diagnostics without exposing values or secrets. */
export function getRuntimeConfigIssues(env: NodeJS.ProcessEnv = process.env): string[] {
  if (env.NODE_ENV !== "production") return [];

  const issues: string[] = [];
  for (const [name, fallback] of PUBLIC_URLS) {
    const value = env[name]?.trim() || fallback;
    if (!/^https:\/\//i.test(value) || isLocalUrl(value)) issues.push(`${name}: must be an HTTPS production URL`);
    if (!isAuterimUrl(value)) issues.push(`${name}: must use an Auterim host`);
  }

  if (!env.NEXT_PUBLIC_SUPABASE_URL?.trim()) issues.push("NEXT_PUBLIC_SUPABASE_URL: missing");
  if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) issues.push("NEXT_PUBLIC_SUPABASE_ANON_KEY: missing");
  return issues;
}

export function isRuntimeConfigValid(env: NodeJS.ProcessEnv = process.env): boolean {
  return getRuntimeConfigIssues(env).length === 0;
}
