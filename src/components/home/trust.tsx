const clients = [
  "St. Regis Marriott",
  "Barb's Home Kitchen",
  "AP Consultants",
];

export default function Trust() {
  return (
    <section className="border-y border-white/[0.06] bg-zinc-900/40 py-10">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center gap-6 md:flex-row md:gap-12">
          <p className="shrink-0 text-xs font-medium uppercase tracking-widest text-zinc-600">
            Worked with
          </p>
          <div className="hidden h-px flex-1 bg-zinc-800 md:block" />
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 md:justify-start">
            {clients.map((client, i) => (
              <span key={client} className="flex items-center gap-10">
                <span className="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-200">
                  {client}
                </span>
                {i < clients.length - 1 && (
                  <span aria-hidden className="hidden h-3 w-px bg-zinc-700 md:block" />
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
