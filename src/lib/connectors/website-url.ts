import net from "node:net";
import { domainToASCII } from "node:url";

import { WEBSITE_LIMITS } from "./website-limits";

export type NormalizedWebsiteOrigin = {
  origin: string;
  hostname: string;
  port: string;
};

export type WebsiteUrlOptions = {
  allowHttpLocalFixture?: boolean;
  allowedSubdomains?: string[];
};

const TRACKING_PARAMS = new Set(["gclid", "dclid", "fbclid", "msclkid", "mc_cid", "mc_eid", "ref", "referrer"]);
const SESSION_PARAMS = new Set(["sid", "session", "sessionid", "token", "auth", "signature", "preview", "nonce"]);

function localFixtureAllowed(options?: WebsiteUrlOptions): boolean {
  return options?.allowHttpLocalFixture === true
    && process.env.NODE_ENV !== "production"
    && process.env.WEBSITE_SYNC_ALLOW_LOCAL_FIXTURE === "true";
}

function asciiHost(hostname: string): string {
  const withoutBrackets = hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (net.isIP(withoutBrackets)) return withoutBrackets.toLowerCase();
  const ascii = domainToASCII(withoutBrackets).toLowerCase();
  if (!ascii || ascii.length > 253) throw new Error("The website hostname is invalid.");
  return ascii;
}

function isIpLiteral(hostname: string): boolean {
  return net.isIP(hostname.replace(/^\[|\]$/g, "")) !== 0;
}

function validateHostname(hostname: string, options?: WebsiteUrlOptions): string {
  const ascii = asciiHost(hostname);
  if (isIpLiteral(ascii) && !(localFixtureAllowed(options) && ["127.0.0.1", "::1"].includes(ascii))) {
    throw new Error("IP-literal website hosts are not allowed.");
  }
  if (ascii === "localhost" || ascii.endsWith(".localhost") || ascii.endsWith(".local") || ascii.endsWith(".internal")) {
    if (!(localFixtureAllowed(options) && ascii === "localhost")) throw new Error("Local and internal website hosts are not allowed.");
  }
  if (ascii.includes("..") || !/^[a-z0-9.:[\]-]+$/i.test(ascii)) throw new Error("The website hostname is invalid.");
  return ascii;
}

export function normalizeWebsiteOrigin(input: string, options?: WebsiteUrlOptions): NormalizedWebsiteOrigin {
  const raw = input.trim();
  if (!raw || raw.length > WEBSITE_LIMITS.maxUrlLength) throw new Error("Enter a valid website origin.");
  let parsed: URL;
  try { parsed = new URL(raw); } catch { throw new Error("Enter a valid website origin, including https://."); }
  const hostname = validateHostname(parsed.hostname, options);
  const local = localFixtureAllowed(options) && ["127.0.0.1", "::1", "localhost"].includes(hostname);
  if (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) throw new Error("Website synchronization requires HTTPS.");
  if (parsed.username || parsed.password || parsed.hash || parsed.search) throw new Error("Website origins cannot include credentials, queries, or fragments.");
  if (parsed.pathname !== "/" && parsed.pathname !== "") throw new Error("Configure the website origin without a path.");
  if (parsed.port && parsed.port !== "443" && !(local && parsed.port)) throw new Error("Only standard HTTPS port 443 is allowed.");
  const port = parsed.port || (parsed.protocol === "https:" ? "443" : "80");
  const origin = `${parsed.protocol}//${hostname}${(parsed.protocol === "https:" && port === "443") || (parsed.protocol === "http:" && port === "80") ? "" : `:${port}`}`;
  return { origin, hostname, port };
}

function hostAllowed(hostname: string, origin: NormalizedWebsiteOrigin, allowedSubdomains: string[]): boolean {
  if (hostname === origin.hostname) return true;
  return allowedSubdomains.some((candidate) => hostname === candidate || hostname.endsWith(`.${candidate}`));
}

export function canonicalizeWebsiteUrl(input: string, origin: NormalizedWebsiteOrigin, options?: WebsiteUrlOptions): string | null {
  if (!input || input.length > WEBSITE_LIMITS.maxUrlLength) return null;
  let parsed: URL;
  try { parsed = new URL(input, `${origin.origin}/`); } catch { return null; }
  if (parsed.protocol !== "https:" && !(localFixtureAllowed(options) && parsed.protocol === "http:")) return null;
  const hostname = validateHostname(parsed.hostname, options);
  const subdomains = (options?.allowedSubdomains ?? []).map((value) => validateHostname(value, options));
  if (!hostAllowed(hostname, origin, subdomains)) return null;
  if (parsed.username || parsed.password || parsed.hash) return null;
  const expectedProtocol = origin.origin.startsWith("https://") ? "https:" : "http:";
  if (parsed.protocol !== expectedProtocol) return null;
  if (parsed.port && parsed.port !== origin.port) return null;
  const params = Array.from(parsed.searchParams.entries()).filter(([key]) => {
    const lower = key.toLowerCase();
    return !lower.startsWith("utm_") && !TRACKING_PARAMS.has(lower);
  });
  if (params.some(([key]) => SESSION_PARAMS.has(key.toLowerCase())) || params.length > 6) return null;
  params.sort(([a], [b]) => a.localeCompare(b));
  parsed.search = "";
  params.forEach(([key, value]) => parsed.searchParams.append(key, value));
  parsed.pathname = parsed.pathname.replace(/\/+/g, "/").replace(/\/\.\//g, "/");
  if (parsed.pathname.length > 1) parsed.pathname = parsed.pathname.replace(/\/$/, "");
  return parsed.toString();
}

export function normalizePathRule(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 240 || !trimmed.startsWith("/") || trimmed.includes("..")) return null;
  return trimmed.replace(/\/+/g, "/");
}

export function matchesWebsitePathRule(pathname: string, rule: string): boolean {
  const escaped = rule.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(pathname);
}

export function websiteUrlAllowed(input: { url: string; origin: NormalizedWebsiteOrigin; allowedSubdomains?: string[]; includePaths?: string[]; excludePaths?: string[]; options?: WebsiteUrlOptions }): boolean {
  const canonical = canonicalizeWebsiteUrl(input.url, input.origin, { ...input.options, allowedSubdomains: input.allowedSubdomains });
  if (!canonical) return false;
  const pathname = new URL(canonical).pathname;
  if ((input.excludePaths ?? []).some((rule) => matchesWebsitePathRule(pathname, rule))) return false;
  const include = input.includePaths?.length ? input.includePaths : ["/"];
  return include.some((rule) => matchesWebsitePathRule(pathname, rule) || (rule.endsWith("/*") && pathname.startsWith(rule.slice(0, -1))));
}

export function websitePathOf(url: string): string {
  try { return new URL(url).pathname || "/"; } catch { return "/"; }
}
