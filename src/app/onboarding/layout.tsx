import Link from "next/link";
import Image from "next/image";
import { type ReactNode } from "react";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/60 bg-zinc-950/95">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-6">
          <Link href="/" className="transition-opacity hover:opacity-80">
            <Image
              src="/logo.png"
              alt="Inovense"
              width={96}
              height={22}
              className="block h-[22px] w-auto"
            />
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">{children}</main>
    </div>
  );
}
