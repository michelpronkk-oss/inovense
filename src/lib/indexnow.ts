import { AUTERIM_DOMAIN, AUTERIM_URL } from "@/lib/brand";

const INDEXNOW_ELIGIBLE_PATHS = new Set([
  "/",
  "/how-it-works",
  "/operators",
  "/control",
  "/use-cases",
  "/connectors",
  "/pricing",
  "/getting-started",
  "/security",
  "/docs",
  "/approvals",
  "/workflows",
  "/architecture",
  "/memory",
  "/trust",
  "/about",
  "/contact",
  "/changelog",
  "/privacy",
  "/terms",
  "/cookies",
]);

export function getIndexNowKey(): string | null {
  const key = process.env.INDEXNOW_KEY?.trim();
  return key && /^[A-Za-z0-9-]{8,128}$/.test(key) ? key : null;
}

function validateChangedUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("IndexNow URLs must be absolute canonical Auterim URLs.");
  }

  if (
    url.origin !== AUTERIM_URL ||
    url.search ||
    url.hash ||
    !INDEXNOW_ELIGIBLE_PATHS.has(url.pathname)
  ) {
    throw new Error("IndexNow only accepts canonical, listed public Auterim URLs.");
  }

  return url.href;
}

export type IndexNowSubmission =
  | { status: "not-configured"; submitted: 0 }
  | { status: "empty"; submitted: 0 }
  | { status: "submitted"; submitted: number; responseStatus: number };

/** Submit only explicitly changed sitemap URLs. This performs no work when the
 * optional key is unset, and it never submits private, query, or token URLs. */
export async function submitIndexNowUrls(
  changedUrls: string[],
  fetcher: typeof fetch = fetch
): Promise<IndexNowSubmission> {
  const urls = [...new Set(changedUrls.map(validateChangedUrl))];
  if (urls.length === 0) return { status: "empty", submitted: 0 };

  const key = getIndexNowKey();
  if (!key) return { status: "not-configured", submitted: 0 };

  const response = await fetcher("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: AUTERIM_DOMAIN,
      key,
      keyLocation: `${AUTERIM_URL}/indexnow-key`,
      urlList: urls,
    }),
  });

  return {
    status: "submitted",
    submitted: urls.length,
    responseStatus: response.status,
  };
}
