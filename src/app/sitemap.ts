import type { MetadataRoute } from "next";

const BASE = "https://inovense.com";
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
      enPath: "/build",
      nlPath: "/nl/build",
      priorityEn: 0.9,
      priorityNl: 0.75,
    }),
    ...localizedEntry({
      enPath: "/systems",
      nlPath: "/nl/systems",
      priorityEn: 0.9,
      priorityNl: 0.75,
    }),
    ...localizedEntry({
      enPath: "/growth",
      nlPath: "/nl/growth",
      priorityEn: 0.9,
      priorityNl: 0.75,
    }),
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
      enPath: "/web-design",
      nlPath: "/nl/web-design",
      priorityEn: 0.85,
      priorityNl: 0.75,
    }),
    ...localizedEntry({
      enPath: "/ai-automation",
      nlPath: "/nl/ai-automation",
      priorityEn: 0.85,
      priorityNl: 0.75,
    }),
    ...localizedEntry({
      enPath: "/shopify-design",
      nlPath: "/nl/shopify-design",
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
      url: `${BASE}/saas-design`,
      lastModified: NOW,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${BASE}/internal-tools`,
      lastModified: NOW,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${BASE}/lead-generation-systems`,
      lastModified: NOW,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${BASE}/work/silentspend`,
      lastModified: NOW,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${BASE}/privacy-policy`,
      lastModified: NOW,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE}/terms-of-use`,
      lastModified: NOW,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
