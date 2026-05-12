"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("Global error:", error);
    }
  }, [error]);

  return (
    <html lang="tr">
      <body className="grid min-h-dvh place-items-center bg-zinc-950 px-4 text-zinc-100">
        <div className="max-w-md text-center">
          <AlertTriangle
            className="mx-auto h-12 w-12 text-red-500"
            strokeWidth={2.2}
          />
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">
            Beklenmedik bir hata
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Sayfa düzgün yüklenemedi. Lütfen tarayıcıyı yenileyin veya
            anasayfaya dönmeyi deneyin.
          </p>
          {error.digest && (
            <code className="mt-6 inline-block rounded-md bg-zinc-800 px-3 py-1.5 font-mono text-xs text-zinc-300">
              digest: {error.digest}
            </code>
          )}
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-lime-400 px-4 py-2 text-sm font-semibold text-black hover:bg-lime-300"
            >
              Tekrar Dene
            </button>
            <a
              href="/"
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-zinc-500"
            >
              Anasayfa
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
