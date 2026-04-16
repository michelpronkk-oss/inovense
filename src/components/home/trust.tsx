import TrustpilotSignal from "@/components/trustpilot-signal";

export default function Trust() {
  return (
    <section className="border-y border-white/[0.06] bg-zinc-950/75 py-7 md:py-8">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-600">
            Built with care
          </p>
          <TrustpilotSignal note="Read verified client reviews" />
        </div>
      </div>
    </section>
  );
}
