import { Container } from "@/components/ui/container";

export default function ShopLoading() {
  return (
    <Container className="py-10 lg:py-14">
      <div className="space-y-3 pb-8">
        <div className="h-9 w-32 animate-pulse rounded-md bg-elevated" />
        <div className="h-4 w-96 animate-pulse rounded-md bg-elevated" />
      </div>
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="hidden w-72 shrink-0 lg:block">
          <div className="h-96 animate-pulse rounded-2xl bg-elevated" />
        </div>
        <div className="flex-1">
          <div className="flex gap-3">
            <div className="h-11 flex-1 animate-pulse rounded-xl bg-elevated sm:max-w-md" />
            <div className="h-11 w-32 animate-pulse rounded-xl bg-elevated" />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-72 animate-pulse rounded-2xl bg-elevated"
              />
            ))}
          </div>
        </div>
      </div>
    </Container>
  );
}
