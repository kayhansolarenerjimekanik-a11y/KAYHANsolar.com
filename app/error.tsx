"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("Page error:", error);
    }
  }, [error]);

  return (
    <Container className="flex min-h-[70vh] flex-col items-center justify-center gap-6 py-20 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-danger/10 text-danger">
        <AlertTriangle className="h-8 w-8" strokeWidth={2.2} />
      </div>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Bir şeyler ters gitti
      </h1>
      <p className="max-w-md text-muted">
        Sayfa yüklenirken beklenmedik bir hata oluştu. Yeniden deneyebilir veya
        anasayfaya dönebilirsiniz.
      </p>
      {error.digest && (
        <code className="rounded-md bg-elevated px-3 py-1 font-mono text-xs text-subtle">
          digest: {error.digest}
        </code>
      )}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Button size="lg" variant="primary" onClick={() => reset()}>
          <RotateCcw className="h-4 w-4" strokeWidth={2.4} />
          Tekrar Dene
        </Button>
      </div>
    </Container>
  );
}
