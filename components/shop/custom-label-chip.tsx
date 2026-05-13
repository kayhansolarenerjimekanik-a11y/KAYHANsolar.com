import { labelColorClasses } from "@/lib/products/label-colors";
import { cn } from "@/lib/utils";
import type { ProductLabel } from "@/types";

export function CustomLabelChip({
  label,
  className,
}: {
  label: ProductLabel;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        labelColorClasses(label.color),
        className,
      )}
    >
      {label.name}
    </span>
  );
}
