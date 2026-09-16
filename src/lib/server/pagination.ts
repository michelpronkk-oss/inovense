import "server-only";

export type PageCursor = { at: string; id?: string };

export function boundedLimit(value: string | number | null | undefined, fallback: number, maximum: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.min(Math.max(Math.floor(parsed), 1), maximum) : fallback;
}

export function encodePageCursor(cursor: PageCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodePageCursor(value: string | null | undefined): PageCursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<PageCursor>;
    return typeof parsed.at === "string" && Number.isFinite(Date.parse(parsed.at)) ? { at: parsed.at, id: typeof parsed.id === "string" ? parsed.id : undefined } : null;
  } catch {
    return null;
  }
}
