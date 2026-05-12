import { Container } from "@/components/ui/container";

export default function ProductLoading() {
  return (
    <Container className="py-8 lg:py-14">
      <div className="h-4 w-64 animate-pulse rounded-md bg-elevated" />
      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <div className="aspect-square w-full animate-pulse rounded-3xl bg-elevated" />
        <div className="flex flex-col gap-6">
          <div className="space-y-3">
            <div className="h-3 w-20 animate-pulse rounded-md bg-elevated" />
            <div className="h-9 w-3/4 animate-pulse rounded-md bg-elevated" />
            <div className="h-4 w-full animate-pulse rounded-md bg-elevated" />
            <div className="h-4 w-2/3 animate-pulse rounded-md bg-elevated" />
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="h-10 w-40 animate-pulse rounded-md bg-elevated" />
            <div className="mt-3 h-4 w-24 animate-pulse rounded-md bg-elevated" />
            <div className="mt-6 h-12 w-full animate-pulse rounded-xl bg-elevated" />
          </div>
        </div>
      </div>
    </Container>
  );
}
