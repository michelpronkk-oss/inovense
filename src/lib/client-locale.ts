export type ClientLocale = "en" | "nl";

function normalizeLeadSource(leadSource: string | null | undefined): string {
  return (leadSource ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export function isDutchClientLeadSource(
  leadSource: string | null | undefined
): boolean {
  const normalized = normalizeLeadSource(leadSource);
  if (!normalized) {
    return false;
  }

  if (normalized === "nl_web") {
    return true;
  }

  if (normalized.startsWith("nl_")) {
    return true;
  }

  if (normalized.includes("dutch") || normalized.includes("nederland")) {
    return true;
  }

  if (normalized === "nl") {
    return true;
  }

  return false;
}

export function getClientLocaleForLeadSource(
  leadSource: string | null | undefined
): ClientLocale {
  return isDutchClientLeadSource(leadSource) ? "nl" : "en";
}
