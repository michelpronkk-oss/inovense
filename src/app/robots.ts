import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/app/", "/app-preview", "/api/", "/client/", "/proposal/", "/onboarding/"],
      },
    ],
    sitemap: "https://auterim.com/sitemap.xml",
  };
}
