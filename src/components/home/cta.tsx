import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CTA() {
  return (
    <section
      id="contact"
      className="relative overflow-hidden border-t border-white/[0.06] py-24 md:py-32"
    >
      {/* Centered gradient separator at top, brand signal */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 flex justify-center"
      >
        <div
          className="h-px w-[60%]"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(73,160,164,0.35) 50%, transparent 100%)",
          }}
        />
      </div>

      {/* Brand ambient glow bottom */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[500px]"
        style={{
          background:
            "radial-gradient(ellipse 55% 55% at 50% 105%, rgba(73,160,164,0.12) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <p className="mb-6 text-xs font-medium uppercase tracking-widest text-brand">
          Get started
        </p>
        <h2 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-5xl">
          Ready to improve your acquisition system?
        </h2>
        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-zinc-400 md:text-lg">
          Share your website and current lead flow. We will reply with a clear build direction and system recommendations.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button
            asChild
            size="lg"
            className="rounded-full bg-brand px-10 text-white hover:bg-brand/90"
          >
            <Link href="/intake">Request a build review</Link>
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

        {/* Trust note */}
        <p className="mt-10 text-xs text-zinc-700">
          Selective intake. Response within 1 business day.
        </p>
      </div>
    </section>
  );
}
