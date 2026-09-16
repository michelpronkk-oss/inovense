import "server-only";

import dns from "node:dns/promises";
import net from "node:net";
import { gunzipSync } from "node:zlib";

import { WEBSITE_LIMITS } from "./website-limits";
import { normalizeWebsiteOrigin, type WebsiteUrlOptions } from "./website-url";

export const WEBSITE_USER_AGENT = process.env.WEBSITE_SYNC_USER_AGENT?.trim() || "AuterimBot/1.0 (+https://auterim.com)";

export type WebsiteFetchKind = "html" | "robots" | "sitemap" | "verification";

export type WebsiteFetchResult = {
  url: string;
  finalUrl: string;
  status: number;
  headers: Headers;
  body: string;
  notModified: boolean;
};

export class WebsiteFetchError extends Error {
  readonly code: string;
  readonly status: number | null;
  readonly retryAfter: string | null;

  constructor(code: string, message: string, status: number | null = null, retryAfter: string | null = null) {
    super(message);
    this.name = "WebsiteFetchError";
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

const originRequestGates = new Map<string, Promise<void>>();
const originLastRequestAt = new Map<string, number>();

async function waitForOriginRequest(origin: string): Promise<void> {
  const previous = originRequestGates.get(origin) ?? Promise.resolve();
  const next = previous.then(async () => {
    const wait = WEBSITE_LIMITS.minimumRequestIntervalMs - (Date.now() - (originLastRequestAt.get(origin) ?? 0));
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    originLastRequestAt.set(origin, Date.now());
  });
  originRequestGates.set(origin, next.catch(() => undefined));
  await next;
}

function ipv4ToNumber(value: string): number | null {
  const parts = value.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return null;
  const octets = parts.map(Number);
  if (octets.some((part) => part < 0 || part > 255)) return null;
  return (((octets[0] * 256 + octets[1]) * 256 + octets[2]) * 256 + octets[3]) >>> 0;
}

function ipv4Blocked(value: string): boolean {
  const number = ipv4ToNumber(value);
  if (number === null) return true;
  const privateRanges = [
    [0 << 24, 8], [10 << 24, 8], [100 << 24 | 64 << 16, 10], [127 << 24, 8], [169 << 24 | 254 << 16, 16],
    [172 << 24 | 16 << 16, 12], [192 << 24, 24], [192 << 24 | 2 << 16, 24], [192 << 24 | 168 << 16, 16],
    [198 << 24 | 18 << 16, 15], [198 << 24 | 51 << 16, 24], [203 << 24, 24], [224 << 24, 4], [240 << 24, 4],
  ] as const;
  for (const [base, bits] of privateRanges) {
    const mask = (0xffffffff << (32 - bits)) >>> 0;
    const network = base >>> 0;
    if ((number & mask) === (network & mask)) return true;
  }
  return false;
}

function ipv6Groups(value: string): number[] | null {
  const withoutZone = value.split("%", 1)[0].toLowerCase();
  const rawParts = withoutZone.split("::");
  if (rawParts.length > 2) return null;
  const parseParts = (part: string): string[] => part ? part.split(":") : [];
  let left = parseParts(rawParts[0]);
  let right = rawParts.length === 2 ? parseParts(rawParts[1]) : [];
  const expandMapped = (parts: string[]): string[] => {
    if (!parts.length || !parts[parts.length - 1].includes(".")) return parts;
    const number = ipv4ToNumber(parts[parts.length - 1]);
    if (number === null) return [];
    return [...parts.slice(0, -1), ((number >>> 16) & 0xffff).toString(16), (number & 0xffff).toString(16)];
  };
  left = expandMapped(left); right = expandMapped(right);
  if (left.length + right.length > 8 || (rawParts.length === 1 && left.length !== 8)) return null;
  const groups = rawParts.length === 2 ? [...left, ...Array(8 - left.length - right.length).fill("0"), ...right] : left;
  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))) return null;
  return groups.map((group) => parseInt(group, 16));
}

function ipv6Blocked(value: string): boolean {
  const groups = ipv6Groups(value);
  if (groups === null) return true;
  if (groups.every((group) => group === 0) || (groups.slice(0, 7).every((group) => group === 0) && groups[7] === 1)) return true;
  if ((groups[0] & 0xfe00) === 0xfc00 || (groups[0] & 0xffc0) === 0xfe80 || (groups[0] & 0xff00) === 0xff00 || (groups[0] === 0x2001 && groups[1] === 0x0db8)) return true;
  // IPv4-mapped IPv6 addresses must be classified using their IPv4 tail.
  if (groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff) {
    const low = (groups[6] << 16) + groups[7];
    return ipv4Blocked(String([(low >>> 24) & 255, (low >>> 16) & 255, (low >>> 8) & 255, low & 255].join(".")));
  }
  return false;
}

function blockedAddress(address: string): boolean {
  const kind = net.isIP(address);
  return kind === 4 ? ipv4Blocked(address) : kind === 6 ? ipv6Blocked(address) : true;
}

async function resolvePublicHost(hostname: string, allowLocalFixture = false): Promise<void> {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  if (["localhost", "metadata.google.internal", "metadata", "instance-data"].includes(normalized) || normalized.endsWith(".localhost") || normalized.endsWith(".internal")) {
    throw new WebsiteFetchError("blocked_host", "The website host is not publicly routable.");
  }
  const resolve = dns.lookup(normalized, { all: true, verbatim: true });
  const records = await Promise.race([
    resolve,
    new Promise<never>((_, reject) => setTimeout(() => reject(new WebsiteFetchError("dns_timeout", "Website DNS resolution timed out.")), 4_000)),
  ]);
  if (!records.length || records.some((record) => blockedAddress(record.address) && !(allowLocalFixture && ["127.0.0.1", "::1"].includes(record.address)))) {
    throw new WebsiteFetchError("blocked_address", "The website host resolves to a disallowed network address.");
  }
}

function acceptedContentType(kind: WebsiteFetchKind, contentType: string): boolean {
  const normalized = contentType.split(";", 1)[0].trim().toLowerCase();
  if (!normalized) return true;
  if (kind === "html" || kind === "verification") return ["text/html", "application/xhtml+xml", "text/plain"].includes(normalized);
  if (kind === "robots") return ["text/plain", "text/html", "application/octet-stream"].includes(normalized);
  return ["application/xml", "text/xml", "application/xml+gzip", "application/gzip", "application/x-gzip", "text/plain"].includes(normalized);
}

function maxBytesFor(kind: WebsiteFetchKind): number {
  if (kind === "robots") return WEBSITE_LIMITS.maxRobotsResponseBytes;
  if (kind === "sitemap") return WEBSITE_LIMITS.maxSitemapResponseBytes;
  return WEBSITE_LIMITS.maxHtmlResponseBytes;
}

async function readBoundedBody(response: Response, maxBytes: number): Promise<Uint8Array> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new WebsiteFetchError("response_too_large", "The website response is too large.", response.status);
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new WebsiteFetchError("response_too_large", "The website response is too large.", response.status);
      }
      chunks.push(next.value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return body;
}

function decodeBody(bytes: Uint8Array, headers: Headers, kind: WebsiteFetchKind): string {
  const contentType = headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() ?? "";
  let decoded = bytes;
  if (["application/gzip", "application/x-gzip", "application/xml+gzip"].includes(contentType)) {
    try { decoded = gunzipSync(bytes, { maxOutputLength: maxBytesFor(kind) }); }
    catch { throw new WebsiteFetchError("invalid_compression", "The website sitemap compression is invalid."); }
  }
  if (decoded.byteLength > maxBytesFor(kind)) throw new WebsiteFetchError("decompressed_response_too_large", "The decompressed website response is too large.");
  return new TextDecoder("utf-8", { fatal: false }).decode(decoded);
}

function sameApprovedHost(url: URL, approvedOrigins: string[], options?: WebsiteUrlOptions): boolean {
  const origin = approvedOrigins[0] ? normalizeWebsiteOrigin(approvedOrigins[0], options) : null;
  if (!origin) return false;
  const allowed = (options?.allowedSubdomains ?? []).map((item) => item.toLowerCase());
  return url.hostname.toLowerCase() === origin.hostname || allowed.some((item) => url.hostname.toLowerCase() === item || url.hostname.toLowerCase().endsWith(`.${item}`));
}

/**
 * The single network boundary for verification, robots, sitemap and page
 * requests. Redirects are manual, every target is re-parsed and re-resolved,
 * cookies are neither accepted nor replayed, and body bytes are hard limited.
 */
export async function safeWebsiteFetch(input: {
  url: string;
  kind: WebsiteFetchKind;
  approvedOrigins: string[];
  allowedSubdomains?: string[];
  headers?: Record<string, string>;
  options?: WebsiteUrlOptions;
}): Promise<WebsiteFetchResult> {
  const maxRedirects = WEBSITE_LIMITS.maxRedirects;
  let current = input.url;
  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    let parsed: URL;
    try { parsed = new URL(current); } catch { throw new WebsiteFetchError("invalid_url", "The website URL is invalid."); }
    if (!["https:", "http:"].includes(parsed.protocol) || !sameApprovedHost(parsed, input.approvedOrigins, { ...input.options, allowedSubdomains: input.allowedSubdomains })) throw new WebsiteFetchError("redirect_not_allowed", "The website request left the approved origin.");
    if (parsed.username || parsed.password || parsed.hash || parsed.port && !["80", "443"].includes(parsed.port)) throw new WebsiteFetchError("unsafe_url", "The website URL is not safe.");
    if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") throw new WebsiteFetchError("https_required", "The website request did not use HTTPS.");
    const allowLocalFixture = input.options?.allowHttpLocalFixture === true && process.env.NODE_ENV !== "production" && process.env.WEBSITE_SYNC_ALLOW_LOCAL_FIXTURE === "true";
    await resolvePublicHost(parsed.hostname, allowLocalFixture);
    // Resolve again immediately before the connection attempt to reduce DNS
    // rebinding exposure in runtimes where a custom lookup agent is unavailable.
    await resolvePublicHost(parsed.hostname, allowLocalFixture);
    let response: Response;
    try {
      await waitForOriginRequest(parsed.origin);
      const conditionalHeaders = Object.fromEntries(Object.entries(input.headers ?? {}).filter(([key]) => ["if-none-match", "if-modified-since"].includes(key.toLowerCase())));
      response = await fetch(parsed, {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(WEBSITE_LIMITS.requestTimeoutMs),
        headers: {
          "user-agent": WEBSITE_USER_AGENT,
          accept: input.kind === "html" || input.kind === "verification" ? "text/html,application/xhtml+xml,text/plain;q=0.8" : input.kind === "robots" ? "text/plain,text/html;q=0.8" : "application/xml,text/xml,application/gzip,text/plain;q=0.5",
          ...conditionalHeaders,
        },
      });
    } catch (error) {
      if (error instanceof WebsiteFetchError) throw error;
      throw new WebsiteFetchError("network_error", "The website could not be reached.");
    }
    if (response.headers.has("set-cookie") || response.status === 401 || response.status === 407) throw new WebsiteFetchError("authentication_not_allowed", "The website requested authentication.", response.status);
    if (response.status >= 300 && response.status < 400) {
      if (redirectCount >= maxRedirects) throw new WebsiteFetchError("redirect_limit", "The website redirect limit was reached.", response.status);
      const location = response.headers.get("location");
      if (!location) throw new WebsiteFetchError("redirect_missing", "The website redirect target was missing.", response.status);
      current = new URL(location, parsed).toString();
      continue;
    }
    if (response.status === 304) return { url: input.url, finalUrl: parsed.toString(), status: 304, headers: response.headers, body: "", notModified: true };
    if (response.status === 404 || response.status === 410 || response.status === 429 || response.status >= 500) throw new WebsiteFetchError(`http_${response.status}`, "The website returned a retryable or unavailable response.", response.status, response.headers.get("retry-after"));
    if (!response.ok) throw new WebsiteFetchError(`http_${response.status}`, "The website request was not successful.", response.status, response.headers.get("retry-after"));
    if (!acceptedContentType(input.kind, response.headers.get("content-type") ?? "")) throw new WebsiteFetchError("unsupported_content_type", "The website response type is not supported.", response.status);
    const bytes = await readBoundedBody(response, maxBytesFor(input.kind));
    return { url: input.url, finalUrl: parsed.toString(), status: response.status, headers: response.headers, body: decodeBody(bytes, response.headers, input.kind), notModified: false };
  }
  throw new WebsiteFetchError("redirect_limit", "The website redirect limit was reached.");
}
