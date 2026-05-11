"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // SSR hydration guard for next-themes — theme resolves only on client
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        aria-hidden
        className="h-9 w-[108px] rounded-full border border-border bg-surface"
      />
    );
  }

  const options = [
    { value: "light", icon: Sun, label: "Aydınlık" },
    { value: "system", icon: Monitor, label: "Sistem" },
    { value: "dark", icon: Moon, label: "Karanlık" },
  ] as const;

  return (
    <div
      role="radiogroup"
      aria-label="Tema seçimi"
      className="inline-flex items-center gap-0.5 rounded-full border border-border bg-surface p-0.5"
    >
      {options.map(({ value, icon: Icon, label }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            onClick={() => setTheme(value)}
            className={`grid h-8 w-8 place-items-center rounded-full transition-colors ${
              active
                ? "bg-lime-primary text-black"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={2.2} />
          </button>
        );
      })}
    </div>
  );
}
