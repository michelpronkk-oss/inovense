import { AUTERIM_URL, toJsonLd } from "@/lib/geo";

type BreadcrumbItem = {
  name: string;
  path: string;
};

/** Structured navigation for public deep pages; it intentionally adds no visible UI. */
export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const itemListElement = items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: new URL(item.path, AUTERIM_URL).toString(),
  }));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: toJsonLd({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement,
        }),
      }}
    />
  );
}
