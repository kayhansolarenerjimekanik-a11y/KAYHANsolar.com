import { Container } from "@/components/ui/container";

interface Props {
  title: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

export function LegalPage({ title, lastUpdated, children }: Props) {
  return (
    <Container className="py-12 lg:py-16">
      <header className="max-w-3xl space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {lastUpdated && (
          <p className="text-xs text-subtle">Son güncelleme: {lastUpdated}</p>
        )}
      </header>

      <div className="prose prose-sm dark:prose-invert mt-8 max-w-3xl [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_p]:my-3 [&_p]:leading-relaxed [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1">
        {children}
      </div>
    </Container>
  );
}
