import Image from "next/image";
import Link from "next/link";

type WorkCase = {
  title: string;
  lane: string;
  summary: string;
  evidence: string[];
  tags: string[];
  status: string;
  href?: string;
  imageSrc?: string;
};

const workCases: WorkCase[] = [
  {
    title: "SilentSpend",
    lane: "Product intelligence",
    summary:
      "Global monetization layer built as a high-trust decision system for pricing and packaging movement.",
    evidence: [
      "Problem: monetization movement was hard to monitor reliably",
      "System: structured signal + evidence decision layer",
      "Proof: live case study with product screenshots",
    ],
    tags: ["Product", "Systems"],
    status: "Live case",
    href: "/work/silentspend",
    imageSrc: "/work/silentspend/hero.png",
  },
  {
    title: "CheckoutLeak",
    lane: "Revenue intelligence",
    summary:
      "Revenue leak detection platform for Shopify and Stripe operators. Website, backend, and core detection engine. Designed and built in full.",
    evidence: [
      "Problem: checkout revenue losses don't surface in standard reports",
      "System: ranked recovery intelligence with root cause and fix paths",
      "Proof: live product, invite-only operator access",
    ],
    tags: ["Product", "Systems", "Build"],
    status: "Live case",
    href: "/work/checkoutleak",
    imageSrc: "/work/checkoutleak/hero.png",
  },
  {
    title: "St. Regis Marriott",
    lane: "Luxury digital infrastructure",
    summary:
      "Hospitality platform engagement focused on premium UX execution and conversion-grade foundations.",
    evidence: [
      "Problem: premium positioning needed stronger digital trust",
      "System: luxury UX and conversion architecture",
      "Proof: publication in progress",
    ],
    tags: ["Build", "Luxury"],
    status: "Publishing soon",
    imageSrc: "/work/st-regis/hero.png",
  },
  {
    title: "The Nude Bottle",
    lane: "Commerce and brand systems",
    summary:
      "Commerce and brand system designed for clearer positioning and clean growth-ready product storytelling.",
    evidence: [
      "Problem: brand and commerce signal was fragmented",
      "System: integrated commerce and storytelling surface",
      "Proof: publication in progress",
    ],
    tags: ["Commerce", "Brand"],
    status: "Publishing soon",
  },
];

function CaseCard({ item }: { item: WorkCase }) {
  const content = (
    <>
      <div className="border-b border-zinc-800/80 px-5 py-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-600">
          {item.lane}
        </p>
      </div>

      <div className="border-b border-zinc-800/80 bg-zinc-950/80">
        {/* Browser chrome */}
        <div className="flex items-center gap-1.5 border-b border-zinc-800/60 bg-zinc-900/70 px-3.5 py-2.5">
          <span className="h-2 w-2 rounded-full bg-zinc-700/80" aria-hidden />
          <span className="h-2 w-2 rounded-full bg-zinc-700/80" aria-hidden />
          <span className="h-2 w-2 rounded-full bg-zinc-700/80" aria-hidden />
          <div className="mx-2 flex-1 rounded-sm bg-zinc-800/80 px-2.5 py-1 text-[9px] text-zinc-600">
            {item.imageSrc ? item.title.toLowerCase().replace(/\s+/g, "") + ".com" : ""}
          </div>
        </div>

        <div className="relative aspect-[16/10]">
          {item.imageSrc ? (
            <Image
              src={item.imageSrc}
              alt={`${item.title} case preview`}
              fill
              sizes="(max-width: 768px) 86vw, (max-width: 1024px) 68vw, 33vw"
              className="h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.015]"
            />
          ) : (
            <div
              className="flex h-full items-end p-5"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)",
                backgroundSize: "26px 26px",
              }}
            >
              <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
                {item.status}
              </p>
            </div>
          )}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(9,9,11,0.30) 0%, rgba(9,9,11,0) 45%)",
            }}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-semibold tracking-tight text-zinc-50 md:text-xl">
          {item.title}
        </h3>
        <p className="mt-2.5 text-sm leading-relaxed text-zinc-500">{item.summary}</p>

        <div className="mt-4 space-y-1.5">
          {item.evidence.map((line) => (
            <p key={line} className="text-xs leading-relaxed text-zinc-600">
              {line}
            </p>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-zinc-800/80 px-2.5 py-1 text-[11px] text-zinc-500"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between pt-5">
          <p className="text-xs text-zinc-600">{item.status}</p>
          {item.href ? (
            <span className="text-xs text-zinc-500 transition-colors group-hover:text-zinc-300">
              Open case
            </span>
          ) : null}
        </div>
      </div>
    </>
  );

  const baseClassName =
    "group flex flex-col min-w-[88%] snap-start overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/55 sm:min-w-[68%] md:min-w-0 md:h-full";

  if (item.href) {
    return (
      <Link href={item.href} className={baseClassName}>
        {content}
      </Link>
    );
  }

  return <article className={baseClassName}>{content}</article>;
}

export default function Work() {
  return (
    <section
      id="work"
      className="border-t border-white/[0.06] bg-zinc-900/20 py-20 md:py-28"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10 flex flex-col gap-5 md:mb-12 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-widest text-brand">
              Selected work
            </p>
            <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
              Product and systems cases.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-500 md:text-base">
              SilentSpend and CheckoutLeak are live. Additional engagements are structured for upcoming case releases.
            </p>
          </div>
        </div>

        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:pb-0">
          {workCases.slice(0, 3).map((item) => (
            <CaseCard key={item.title} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
