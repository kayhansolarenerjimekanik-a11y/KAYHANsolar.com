import { Container } from "@/components/ui/container";

export default function PublicLoading() {
  return (
    <Container className="py-14">
      <div className="space-y-3">
        <div className="h-8 w-48 animate-pulse rounded-md bg-elevated" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-elevated" />
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-2xl bg-elevated" />
        ))}
      </div>
    </Container>
  );
}
