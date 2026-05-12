import { Container } from "@/components/ui/container";

export default function OfferLoading() {
  return (
    <Container className="py-10 lg:py-14">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-2 flex-1 animate-pulse rounded-full bg-elevated"
            />
          ))}
        </div>
        <div className="h-8 w-2/3 animate-pulse rounded-md bg-elevated" />
        <div className="space-y-3 rounded-2xl border border-border bg-surface p-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-24 animate-pulse rounded-md bg-elevated" />
              <div className="h-11 w-full animate-pulse rounded-xl bg-elevated" />
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}
