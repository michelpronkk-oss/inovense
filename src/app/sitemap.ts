import type { MetadataRoute } from "next";

const BASE = "https://auterim.com";
const NOW = new Date();

function localizedEntry({
  enPath,
  nlPath,
  priorityEn,
  priorityNl,
}: {
  enPath: string;
  nlPath: string;
  priorityEn: number;
  priorityNl: number;
}): MetadataRoute.Sitemap {
  return [
    {
      url: `${BASE}${enPath}`,
      lastModified: NOW,
      changeFrequency: "monthly",
      priority: priorityEn,
      alternates: {
        languages: {
          en: `${BASE}${enPath}`,
          nl: `${BASE}${nlPath}`,
        },
      },
    },
    {
      url: `${BASE}${nlPath}`,
      lastModified: NOW,
      changeFrequency: "monthly",
      priority: priorityNl,
      alternates: {
        languages: {
          en: `${BASE}${enPath}`,
          nl: `${BASE}${nlPath}`,
        },
      },
    },
  ];
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE,
      lastModified: NOW,
      changeFrequency: "monthly",
      priority: 1,
      alternates: {
        languages: {
          en: BASE,
          nl: `${BASE}/nl`,
        },
      },
    },
    ...localizedEntry({
      enPath: "/process",
      nlPath: "/nl/process",
      priorityEn: 0.7,
      priorityNl: 0.75,
    }),
    ...localizedEntry({
      enPath: "/intake",
      nlPath: "/nl/intake",
      priorityEn: 0.8,
      priorityNl: 0.7,
    }),
    ...localizedEntry({
      enPath: "/ai-automation",
      nlPath: "/nl/ai-automation",
      priorityEn: 0.85,
      priorityNl: 0.75,
    }),
    {
      url: `${BASE}/answers`,
      lastModified: NOW,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: `${BASE}/privacy`,
      lastModified: NOW,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE}/terms`,
      lastModified: NOW,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE}/cookies`,
      lastModified: NOW,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
