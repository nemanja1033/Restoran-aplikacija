import { MobileNav } from "@/components/mobile-nav";
import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,209,102,0.18),_transparent_45%),linear-gradient(120deg,_rgba(160,196,255,0.15),_transparent_35%),linear-gradient(180deg,_#f8fafc,_#eef2ff)] dark:bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.25),_transparent_45%),linear-gradient(160deg,_rgba(15,23,42,0.85),_rgba(2,6,23,0.95))]">
      <div className="mx-auto grid min-h-screen max-w-[1400px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[280px_1fr]">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <main className="rounded-3xl border bg-background/80 p-4 shadow-sm backdrop-blur sm:p-6">
          <div className="mb-6">
            <MobileNav />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
