import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function BuildCTA() {
  return (
    <section
      id="build-contact"
      className="relative overflow-hidden border-t border-white/[0.06] py-24 md:py-32"
    >
      {/* Centered gradient separator at top */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 flex justify-center"
      >
        <div
          className="h-px w-[55%]"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(73,160,164,0.4) 50%, transparent 100%)",
          }}
        />
      </div>

      {/* Bottom glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[500px]"
        style={{
          background:
            "radial-gradient(ellipse 55% 55% at 50% 110%, rgba(73,160,164,0.11) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <p className="mb-6 text-xs font-medium uppercase tracking-widest text-brand">
          Start a build
        </p>

        <h2 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-5xl">
          Ready to build something that converts?
        </h2>

        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-zinc-400 md:text-lg">
          Send us a brief and we will scope your project within 48 hours.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button
            asChild
            size="lg"
            className="rounded-full bg-brand px-10 text-white hover:bg-brand/90"
          >
            <Link href="/intake">
              Start a build project
            </Link>
          </Button>
          <span className="text-sm text-zinc-600">
            or email{" "}
            <a
              href="mailto:hello@inovense.com"
              className="text-zinc-400 transition-colors hover:text-zinc-50"
            >
              hello@inovense.com
            </a>
          </span>
        </div>

        {/* Trust strip: flex-wrap for mobile, one brand dot per item */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {["Fixed-price proposals. No hidden costs."].map(
            (item) => (
              <span
                key={item}
                className="flex items-center gap-2 text-xs text-zinc-700"
              >
                <span className="h-1 w-1 shrink-0 rounded-full bg-brand/50" />
                {item}
              </span>
            )
          )}
        </div>

      </div>
    </section>
  );
}
