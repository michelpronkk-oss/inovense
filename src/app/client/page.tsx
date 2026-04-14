import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project Workspace | Inovense",
  robots: { index: false, follow: false },
};

export default function ClientWorkspaceEntryPage() {
  return (
    <div className="px-4 py-20">
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-zinc-800/80 bg-zinc-900/35 p-6 sm:p-7">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-brand">
          Inovense
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
          Project Workspace
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Use the secure workspace link from your Inovense email to open your
          project view. If you need help accessing it, contact{" "}
          <a
            href="mailto:hello@inovense.com"
            className="text-zinc-300 underline underline-offset-2 hover:text-zinc-100"
          >
            hello@inovense.com
          </a>
          .
        </p>
      </div>
    </div>
  );
}
