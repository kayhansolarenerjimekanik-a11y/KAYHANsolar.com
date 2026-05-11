"use client";

import { useState, type ReactNode } from "react";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

interface AdminShellProps {
  email: string;
  unreadCount: number;
  children: ReactNode;
}

export function AdminShell({ email, unreadCount, children }: AdminShellProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 overflow-y-auto border-r border-border bg-surface lg:block">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-lime-primary text-sm font-bold text-black">
            K
          </span>
          <span className="text-sm font-semibold tracking-tight">
            KAYHAN <span className="text-muted">Yönetim</span>
          </span>
        </div>
        <Sidebar unreadCount={unreadCount} />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-surface shadow-2xl">
            <div className="flex h-14 items-center gap-2 border-b border-border px-4">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-lime-primary text-sm font-bold text-black">
                K
              </span>
              <span className="text-sm font-semibold tracking-tight">
                KAYHAN <span className="text-muted">Yönetim</span>
              </span>
            </div>
            <Sidebar unreadCount={unreadCount} />
          </aside>
        </div>
      )}

      <div className="flex min-h-dvh flex-1 flex-col">
        <Topbar email={email} onToggleSidebar={() => setOpen((v) => !v)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
