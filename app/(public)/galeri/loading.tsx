import { Container } from "@/components/ui/container";

export default function GalleryLoading() {
  return (
    <Container className="py-10 lg:py-14">
      <div className="space-y-3 pb-10">
        <div className="h-9 w-48 animate-pulse rounded-md bg-elevated" />
        <div className="h-4 w-96 animate-pulse rounded-md bg-elevated" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-elevated" />
            <div className="h-4 w-3/4 animate-pulse rounded-md bg-elevated" />
            <div className="h-3 w-1/2 animate-pulse rounded-md bg-elevated" />
          </div>
        ))}
      </div>
    </Container>
  );
}
