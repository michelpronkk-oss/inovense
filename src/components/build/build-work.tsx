const projects = [
  {
    id: "st-regis-marriott",
    client: "St. Regis Marriott",
    category: "Website Development",
    whatChanged:
      "An outdated digital presence was replaced with a premium, conversion-oriented website architecture aligned to luxury positioning.",
    resultSnapshot:
      "Trust signal increased through clearer page hierarchy, stronger visual authority, and performance-focused implementation.",
    proofType: "Website trust and conversion clarity",
    tags: ["Web Design", "Development", "SEO"],
  },
  {
    id: "barbs-home-kitchen",
    client: "Barb's Home Kitchen",
    category: "E-commerce and Brand",
    whatChanged:
      "Commerce and brand storytelling were unified across storefront, product pages, and mobile-first buying flow.",
    resultSnapshot:
      "Purchase decisions became easier on mobile through better product structure and cleaner conversion paths.",
    proofType: "Commerce UX and conversion architecture",
    tags: ["E-commerce", "Brand", "Shopify"],
  },
  {
    id: "ap-consultants",
    client: "AP Consultants",
    category: "Brand Website",
    whatChanged:
      "Brand and web presence were rebuilt to reflect professional authority and reduce qualification friction from first visit.",
    resultSnapshot:
      "Sharper positioning and clearer service communication improved visitor understanding before first contact.",
    proofType: "Positioning and trust clarity",
    tags: ["Branding", "Web Design", "Development"],
  },
];

export default function BuildWork() {
  return (
    <section
      id="build-work"
      className="border-t border-white/[0.06] bg-zinc-900/15 py-24 md:py-32"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-widest text-brand">
              Build work
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
              Selected Build outcomes.
            </h2>
          </div>
          <a
            href="#build-contact"
            className="self-start text-sm font-medium text-zinc-500 transition-colors hover:text-brand md:self-auto"
          >
            Request a build review
          </a>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {projects.map((project) => (
            <article
              id={project.id}
              key={project.client}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900"
            >
              <div className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-brand/60 transition-transform duration-500 ease-out group-hover:scale-x-100" />

              <span className="mb-6 text-xs font-medium uppercase tracking-widest text-zinc-600 transition-colors group-hover:text-brand/70">
                {project.category}
              </span>

              <h3 className="mb-4 text-xl font-semibold text-zinc-50">
                {project.client}
              </h3>

              <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-zinc-600">
                What changed
              </p>
              <p className="mb-4 text-sm leading-relaxed text-zinc-500">
                {project.whatChanged}
              </p>

              <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-zinc-600">
                Result snapshot
              </p>
              <p className="mb-4 text-sm leading-relaxed text-zinc-500">
                {project.resultSnapshot}
              </p>

              <p className="mb-6 text-xs text-zinc-600">{project.proofType}</p>

              <div className="mt-auto flex flex-wrap gap-2 border-t border-zinc-800 pt-6">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-600 transition-colors group-hover:border-zinc-700 group-hover:text-zinc-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
