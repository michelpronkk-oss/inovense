import type { ReactNode } from "react";
import EarlyAccessProvider from "@/components/early-access/early-access-provider";
import V3Footer from "./v3-footer";
import V3Header from "./v3-header";
import "./auterim-v3.css";
import "./auterim-v3-refinement.css";
import "./auterim-v3-typography.css";
import "./public-pages.css";

export default function PublicSiteFrame({ children }: { children: ReactNode }) {
  return (
    <EarlyAccessProvider>
      <div className="auterim-v3-page public-page">
        <V3Header />
        <main>{children}</main>
        <V3Footer />
      </div>
    </EarlyAccessProvider>
  );
}
