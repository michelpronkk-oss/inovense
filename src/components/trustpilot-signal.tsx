type TrustpilotSignalProps = {
  className?: string;
  note?: string;
};

const TRUSTPILOT_URL = "https://www.trustpilot.com/review/inovense.com";

export default function TrustpilotSignal({
  className = "",
  note = "Read client reviews",
}: TrustpilotSignalProps) {
  return (
    <a
      href={TRUSTPILOT_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View Inovense on Trustpilot"
      className={`group inline-flex items-center gap-2.5 rounded-full border border-zinc-800/80 bg-zinc-900/60 px-3.5 py-2 text-xs transition-colors hover:border-zinc-700 hover:bg-zinc-900 ${className}`.trim()}
    >
      <span
        aria-hidden
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#00b67a]/15"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2.2l2.94 5.95 6.56.95-4.75 4.63 1.12 6.53L12 17.18l-5.87 3.08 1.12-6.53-4.75-4.63 6.56-.95L12 2.2z"
            fill="#00B67A"
          />
        </svg>
      </span>

      <span className="font-medium tracking-[0.02em] text-zinc-300 transition-colors group-hover:text-zinc-100">
        Trustpilot
      </span>

      <span className="hidden h-3 w-px bg-zinc-800 sm:block" aria-hidden />

      <span className="hidden text-zinc-500 sm:block">{note}</span>

      <svg
        width="10"
        height="10"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden
        className="text-zinc-600 transition-colors group-hover:text-zinc-400"
      >
        <path
          d="M3 9L9 3M9 3H4.5M9 3v4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  );
}
