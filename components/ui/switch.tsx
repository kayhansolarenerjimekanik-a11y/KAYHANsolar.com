"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, id, ...props }, ref) => (
    <label
      htmlFor={id}
      className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground"
    >
      <span className="relative inline-block h-6 w-11">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          className="peer sr-only"
          {...props}
        />
        <span className="absolute inset-0 rounded-full bg-border-strong transition-colors peer-checked:bg-lime-primary" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
      {label && <span className={cn(className)}>{label}</span>}
    </label>
  ),
);
Switch.displayName = "Switch";
