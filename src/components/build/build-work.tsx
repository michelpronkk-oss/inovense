const projects = [
  {
    client: "St. Regis Marriott",
    category: "Website Development",
    outcome:
      "A complete digital rebuild centered on brand trust and direct bookings. Designed to match the luxury standard of the property and perform on every device.",
    result: "Full redesign · Conversion architecture · Performance audit",
    tags: ["Web Design", "Development", "SEO"],
  },
  {
    client: "Barb's Home Kitchen",
    category: "E-commerce & Brand",
    outcome:
      "End-to-end e-commerce build with brand refresh for a growing food business. Mobile-first, conversion-optimised, and built around product storytelling.",
    result: "E-commerce build · Brand identity · Mobile-first",
    tags: ["E-commerce", "Brand", "Shopify"],
  },
  {
    client: "AP Consultants",
    category: "Brand Website",
    outcome:
      "Brand identity and digital presence for a professional services firm. Designed to project authority and bring in better conversations from the first click.",
    result: "Brand identity · Web presence · Positioning",
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

        {/* Header */}
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
            Start your build project →
          </a>
        </div>

        {/* Project cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.client}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900"
            >
              {/* Top accent line on hover */}
              <div className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-brand/60 transition-transform duration-500 ease-out group-hover:scale-x-100" />

              {/* Category */}
              <span className="mb-6 text-xs font-medium uppercase tracking-widest text-zinc-600 transition-colors group-hover:text-brand/70">
                {project.category}
              </span>

              {/* Client */}
              <h3 className="mb-4 text-xl font-semibold text-zinc-50">
                {project.client}
              </h3>

              {/* Outcome */}
              <p className="mb-6 text-sm leading-relaxed text-zinc-500">
                {project.outcome}
              </p>

              {/* Result line */}
              <p className="mb-6 text-xs leading-relaxed text-zinc-600">
                {project.result}
              </p>

              {/* Tags */}
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
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
