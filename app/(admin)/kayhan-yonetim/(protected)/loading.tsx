export default function AdminLoading() {
  return (
    <div className="space-y-4 p-6">
      <div className="h-9 w-48 animate-pulse rounded-md bg-elevated" />
      <div className="h-4 w-96 animate-pulse rounded-md bg-elevated" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-elevated" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-2xl bg-elevated" />
    </div>
  );
}
