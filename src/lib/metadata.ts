import type { Metadata } from "next";
import { AUTERIM_URL } from "@/lib/brand";

type LocaleCode = "en" | "nl";

function normalizePath(path: string): string {
  if (!path || path === "/") return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

export function absoluteSiteUrl(path: string): string {
  const normalizedPath = normalizePath(path);
  if (normalizedPath === "/") return AUTERIM_URL;
  return `${AUTERIM_URL}${normalizedPath}`;
}

export function buildLocalizedAlternates({
  canonicalPath,
  enPath,
  nlPath,
  xDefault = "en",
}: {
  canonicalPath: string;
  enPath: string;
  nlPath: string;
  xDefault?: LocaleCode;
}): NonNullable<Metadata["alternates"]> {
  const enUrl = absoluteSiteUrl(enPath);
  const nlUrl = absoluteSiteUrl(nlPath);

  return {
    canonical: absoluteSiteUrl(canonicalPath),
    languages: {
      en: enUrl,
      nl: nlUrl,
      "x-default": xDefault === "nl" ? nlUrl : enUrl,
    },
  };
}
