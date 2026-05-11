import { ArrowRight, Construction } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

interface PagePlaceholderProps {
  title: string;
  description: string;
  phase?: string;
  primaryCta?: { href: string; label: string };
}

export function PagePlaceholder({
  title,
  description,
  phase,
  primaryCta,
}: PagePlaceholderProps) {
  return (
    <Container className="flex min-h-[70vh] flex-col items-start justify-center gap-6 py-16 lg:py-24">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-lime-primary/15 text-lime-dark dark:text-lime-primary">
        <Construction className="h-6 w-6" strokeWidth={2.2} />
      </div>
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="max-w-2xl text-base text-muted">{description}</p>
        {phase && (
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-elevated px-3 py-1 text-xs font-medium text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-primary" />
            {phase}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 pt-2">
        {primaryCta && (
          <Link href={primaryCta.href}>
            <Button size="lg">
              {primaryCta.label}
              <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
            </Button>
          </Link>
        )}
        <Link href="/">
          <Button size="lg" variant="outline">
            Anasayfa
          </Button>
        </Link>
      </div>
    </Container>
  );
}
