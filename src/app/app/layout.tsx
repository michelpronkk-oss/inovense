import "./dashboard.css";
import { AppProvider } from "@/lib/os/app-provider";
import { AppShell } from "@/app/app/app-shell";

export const metadata = {
  title: "Inovense OS",
  description: "AI operating layer",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
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
        <AppShell>{children}</AppShell>
      </div>
    </AppProvider>
  );
}
