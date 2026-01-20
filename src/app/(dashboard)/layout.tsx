import { MobileNav } from "@/components/mobile-nav";
import { Sidebar } from "@/components/sidebar";
import { AuthGuard } from "@/components/auth-guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,240,200,0.6),_transparent_55%),radial-gradient(circle_at_15%_20%,_rgba(169,210,255,0.35),_transparent_55%),linear-gradient(180deg,_#f7f6f2,_#eef2f7)] dark:bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.25),_transparent_45%),linear-gradient(160deg,_rgba(15,23,42,0.85),_rgba(2,6,23,0.95))]">
      <div className="mx-auto grid min-h-screen max-w-[1400px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[280px_1fr]">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <main className="rounded-3xl border border-white/60 bg-background/80 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]">
          <AuthGuard>
            {/* Mobile UX checklist: spacing scale, readable type, 44px+ taps, no overflow */}
            <div className="px-5 py-14 sm:px-8 sm:py-[4.5rem] lg:px-10 lg:py-24">
              <div className="mb-8">
                <MobileNav />
              </div>
              <div className="space-y-8 sm:space-y-10">{children}</div>
            </div>
          </AuthGuard>
        </main>
      </div>
    </div>
  );
}
