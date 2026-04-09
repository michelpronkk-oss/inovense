import Image from "next/image";
import Link from "next/link";

type WorkCase = {
  title: string;
  lane: string;
  summary: string;
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
    tags: ["Product", "Systems"],
    status: "Live case",
    href: "/work/silentspend",
    imageSrc: "/work/silentspend/hero.png",
  },
  {
    title: "St. Regis Marriott",
    lane: "Luxury digital infrastructure",
    summary:
      "Hospitality platform engagement focused on premium UX execution and conversion-grade foundations.",
    tags: ["Build", "Luxury"],
    status: "Publishing soon",
  },
  {
    title: "The Nude Bottle",
    lane: "Commerce and brand systems",
    summary:
      "Commerce and brand system designed for clearer positioning and clean growth-ready product storytelling.",
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

      <div className="relative aspect-[16/10] border-b border-zinc-800/80 bg-zinc-950/80">
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

      <div className="flex min-h-[216px] flex-col p-5 md:min-h-[230px]">
        <h3 className="text-lg font-semibold tracking-tight text-zinc-50 md:text-xl">
          {item.title}
        </h3>
        <p className="mt-2.5 text-sm leading-relaxed text-zinc-500">{item.summary}</p>

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
    "group block min-w-[88%] snap-start overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/55 sm:min-w-[68%] md:min-w-0 md:h-full";

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
              SilentSpend is live. Additional engagements are structured for upcoming case releases.
            </p>
          </div>
          <Link
            href="/work/silentspend"
            className="self-start text-sm font-medium text-zinc-500 transition-colors hover:text-brand md:self-auto"
          >
            Open SilentSpend
          </Link>
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
