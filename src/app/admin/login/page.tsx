import type { Metadata } from "next";
import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Sign in | Inovense CRM",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  // Already authenticated - redirect to CRM
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token && (await verifySessionToken(token))) {
    redirect("/admin");
  }

  const { from } = await searchParams;
  const safeDest =
    from?.startsWith("/admin") && from !== "/admin/login" ? from : "/admin";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">

        {/* Card */}
        <div className="overflow-hidden rounded-xl border border-zinc-800/80">

          {/* Top accent bar */}
          <div
            aria-hidden
            style={{
              height: "2px",
              background:
                "linear-gradient(90deg, transparent 0%, rgba(73,160,164,0.55) 40%, rgba(73,160,164,0.55) 60%, transparent 100%)",
            }}
          />

          {/* Card body */}
          <div className="bg-zinc-900/50 px-8 py-9">

            {/* Logo */}
            <div className="mb-8">
              <Image
                src="/logo.png"
                alt="Inovense"
                width={100}
                height={23}
                className="block h-[23px] w-auto"
                priority
              />
              <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-600">
                CRM
              </p>
            </div>

            {/* Heading */}
            <div className="mb-7">
              <h1 className="text-base font-semibold text-zinc-100">
                Sign in
              </h1>
              <p className="mt-1 text-xs text-zinc-600">
                Internal access only.
              </p>
            </div>

            <LoginForm from={safeDest} />
          </div>
        </div>

      </div>
    </div>
  );
}
