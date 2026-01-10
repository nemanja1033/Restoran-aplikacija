"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarNavContent } from "@/components/sidebar";

export function MobileNav() {
  return (
    <div className="flex items-center justify-between lg:hidden">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Finansije
        </p>
        <h1 className="text-lg font-semibold">Restoran kontrola</h1>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetHeader>
            <SheetTitle>Navigacija</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <SidebarNavContent />
          </div>
        </SheetContent>
      </Sheet>
      </div>
    </div>
  );
}
