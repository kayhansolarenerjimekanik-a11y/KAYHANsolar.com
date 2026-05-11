import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignInForm } from "@/components/admin/sign-in-form";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Yönetici Girişi",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const session = await getSession();
  if (session) redirect("/kayhan-yonetim");

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-lime-primary text-black">
            <ShieldCheck className="h-6 w-6" strokeWidth={2.4} />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            KAYHAN Yönetim
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Bu alan yalnızca yetkili personel içindir.
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-6 shadow-xl shadow-black/5 sm:p-8">
          <SignInForm />
        </div>

        <p className="mt-6 text-center text-xs text-subtle">
          Demo modu — kimlik bilgileri .env.local içinde tanımlı.
        </p>
      </div>
    </div>
  );
}
