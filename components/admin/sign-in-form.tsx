"use client";

import { Lock, LogIn, Mail } from "lucide-react";
import { useActionState } from "react";

import { signInAction, type SignInState } from "@/app/(admin)/kayhan-yonetim/actions/auth";
import { Button } from "@/components/ui/button";

const initialState: SignInState = {};

export function SignInForm() {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          E-posta
        </label>
        <div className="relative">
          <Mail
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            strokeWidth={2.2}
          />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="admin@kayhansolar.com"
            className="h-11 w-full rounded-xl border border-border bg-elevated pl-10 pr-3 text-sm text-foreground placeholder:text-subtle focus:border-lime-primary focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Şifre
        </label>
        <div className="relative">
          <Lock
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            strokeWidth={2.2}
          />
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="h-11 w-full rounded-xl border border-border bg-elevated pl-10 pr-3 text-sm text-foreground focus:border-lime-primary focus:outline-none"
          />
        </div>
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {state.error}
        </p>
      )}

      <Button type="submit" variant="primary" size="lg" disabled={pending} className="w-full">
        <LogIn className="h-4 w-4" strokeWidth={2.4} />
        {pending ? "Giriş yapılıyor..." : "Giriş Yap"}
      </Button>
    </form>
  );
}
