import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  tone?: "default" | "warning" | "danger";
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  href,
  tone = "default",
}: KpiCardProps) {
  const toneRing =
    tone === "warning"
      ? "ring-warning/30"
      : tone === "danger"
        ? "ring-danger/30"
        : "ring-transparent";

  const inner = (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface p-5 ring-1 transition-colors",
        toneRing,
        href && "hover:border-lime-primary hover:shadow-lg hover:shadow-lime-primary/10",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-subtle">
          {label}
        </span>
        <Icon className="h-4 w-4 text-muted" strokeWidth={2.2} />
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}
