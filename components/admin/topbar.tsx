"use client";

import { LogOut, Menu } from "lucide-react";

import { NotificationBell } from "@/components/admin/notification-bell";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";

interface TopbarProps {
  email: string;
  initialUnreadCount: number;
  onToggleSidebar: () => void;
}

export function Topbar({ email, initialUnreadCount, onToggleSidebar }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label="Menüyü aç/kapat"
        className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted hover:text-foreground lg:hidden"
      >
        <Menu className="h-4 w-4" strokeWidth={2.2} />
      </button>

      <div className="ml-auto flex items-center gap-2">
        <NotificationBell initialCount={initialUnreadCount} />
        <ThemeToggle />
        <span className="hidden text-xs text-muted sm:inline">{email}</span>
        <form action="/kayhan-yonetim/cikis" method="post">
          <Button type="submit" variant="outline" size="sm">
            <LogOut className="h-4 w-4" strokeWidth={2.2} />
            Çıkış
          </Button>
        </form>
      </div>
    </header>
  );
}
