import type { Metadata } from "next";
import ClaudeHomeV2 from "@/components/home/claude-home-v2";

export const metadata: Metadata = {
  title: "Inovense | Homepage V2 Preview",
  description:
    "Inovense homepage v2 preview with smoother motion and refined spacing rhythm while preserving the premium dark operating layer style.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function HomeV2Page() {
  return (
    <main>
      <ClaudeHomeV2 />
    </main>
  );
}

