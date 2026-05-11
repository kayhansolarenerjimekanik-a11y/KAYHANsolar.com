import { ArrowLeft, Home } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export default function NotFound() {
  return (
    <Container className="flex min-h-[70vh] flex-col items-center justify-center gap-6 py-20 text-center">
      <span className="text-7xl font-semibold tracking-tighter text-lime-primary">
        404
      </span>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Aradığınız sayfa bulunamadı
      </h1>
      <p className="max-w-md text-muted">
        Bağlantı hatalı veya sayfa kaldırılmış olabilir. Aşağıdaki bağlantılarla
        devam edebilirsiniz.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link href="/">
          <Button size="lg" variant="primary">
            <Home className="h-4 w-4" strokeWidth={2.4} />
            Anasayfaya Dön
          </Button>
        </Link>
        <Link href="/magaza">
          <Button size="lg" variant="outline">
            <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
            Mağazaya Göz At
          </Button>
        </Link>
      </div>
    </Container>
  );
}
