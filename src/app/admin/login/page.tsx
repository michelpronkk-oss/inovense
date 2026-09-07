import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getInternalAdmin } from "@/lib/admin/auth";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Sign in | Auterim Admin",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (await getInternalAdmin()) redirect("/");
  const { from } = await searchParams;
  const safeDest = from?.startsWith("/") && !from.startsWith("//") && from !== "/login" ? from : "/";

  return (
    <div className="admin-login-shell">
      <div className="admin-login-orb admin-login-orb-one" aria-hidden />
      <div className="admin-login-orb admin-login-orb-two" aria-hidden />
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <div className="admin-login-brand"><Image src="/brand/auterim-mark-live.svg" alt="" width={32} height={32} priority /><span>AUTERIM</span></div>
        <p className="admin-login-label">Internal access</p>
        <h1 id="admin-login-title">Sign in to Auterim admin</h1>
        <p className="admin-login-copy">Authorized personnel only. Access the secure internal command center.</p>
        <LoginForm from={safeDest} />
      </section>
    </div>
  );
}
