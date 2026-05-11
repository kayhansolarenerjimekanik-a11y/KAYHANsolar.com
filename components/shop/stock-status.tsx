import { cn } from "@/lib/utils";

interface StockStatusProps {
  stockQuantity: number;
  lowStockThreshold?: number;
  className?: string;
}

export function StockStatus({
  stockQuantity,
  lowStockThreshold = 3,
  className,
}: StockStatusProps) {
  let label: string;
  let dotColor: string;
  let textColor: string;

  if (stockQuantity === 0) {
    label = "Tükendi";
    dotColor = "bg-danger";
    textColor = "text-danger";
  } else if (stockQuantity <= lowStockThreshold) {
    label = `Son ${stockQuantity} adet`;
    dotColor = "bg-warning";
    textColor = "text-warning";
  } else {
    label = "Stokta";
    dotColor = "bg-success";
    textColor = "text-success";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        textColor,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
      {label}
    </span>
  );
}
