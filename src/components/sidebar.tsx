"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  Settings,
  HandCoins,
  Users,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export const navItems = [
  { href: "/", label: "Kontrolna tabla", icon: LayoutDashboard },
  { href: "/prihodi", label: "Prihodi", icon: Wallet },
  { href: "/troskovi", label: "Troškovi", icon: HandCoins },
  { href: "/dobavljaci", label: "Dobavljači", icon: Users },
  { href: "/pdv-izvestaj", label: "PDV izveštaj", icon: FileText },
  { href: "/podesavanja", label: "Podešavanja", icon: Settings },
];

function SidebarContent() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex flex-1 flex-col gap-2">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition",
                active
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          localStorage.removeItem("auth_token");
          router.push("/login");
        }}
      >
        Odjava
      </Button>
      <div className="rounded-xl border border-dashed border-muted-foreground/30 p-4 text-xs text-muted-foreground">
        Podaci se čuvaju lokalno u SQLite bazi i dostupni su offline.
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="flex h-full flex-col gap-6 border-r bg-card/70 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Finansije
          </p>
          <h1 className="text-lg font-semibold">Restoran kontrola</h1>
        </div>
        <ThemeToggle />
      </div>
      <SidebarContent />
    </aside>
  );
}

export function SidebarNavContent() {
  return <SidebarContent />;
}
