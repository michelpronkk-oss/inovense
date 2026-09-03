import type { Metadata } from "next";
import "@/app/app/dashboard.css";
import { AppProvider } from "@/lib/os/app-provider";
import { OSSidebar } from "@/components/dashboard/sidebar";
import { OSTopbar } from "@/components/dashboard/topbar";
import { OSOverview } from "@/components/dashboard/overview";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AppPreviewPage() {
  return (
    <AppProvider>
      <div
        className="os-root"
        style={{
          background:
            "radial-gradient(800px 500px at 80% -200px, rgba(77,232,225,0.05), transparent 60%), #06070A",
          minHeight: "100vh",
        }}
      >
        <div className="os">
          <OSSidebar />
          <div className="os-main">
            <OSTopbar />
            <OSOverview />
          </div>
        </div>
      </div>
    </AppProvider>
  );
}
