// components/admin/data-table/data-table-empty.tsx
import type { EmptyStateConfig } from "./types";

interface Props {
  config: EmptyStateConfig;
}

export function DataTableEmpty({ config }: Props) {
  const Icon = config.icon;
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-elevated p-10 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-surface text-muted">
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{config.title}</p>
        <p className="mt-1 text-sm text-muted">{config.description}</p>
      </div>
      {config.action && <div className="mt-2">{config.action}</div>}
    </div>
  );
}
