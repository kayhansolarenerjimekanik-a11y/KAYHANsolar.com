"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchUnreadCountAction } from "@/app/(admin)/kayhan-yonetim/actions/notifications";

interface NotificationBellProps {
  initialCount: number;
}

const POLL_MS = 30_000;

export function NotificationBell({ initialCount }: NotificationBellProps) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const next = await fetchUnreadCountAction();
        if (!cancelled) setCount(next);
      } catch {
        // Silent — keep last known count on transient errors
      }
    };
    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <Link
      href="/kayhan-yonetim/bildirimler"
      aria-label={count > 0 ? `Bildirimler — ${count} okunmamış` : "Bildirimler"}
      className="relative grid h-9 w-9 place-items-center rounded-lg border border-border text-muted hover:text-foreground"
    >
      <Bell className="h-4 w-4" strokeWidth={2.2} />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold tabular-nums text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
