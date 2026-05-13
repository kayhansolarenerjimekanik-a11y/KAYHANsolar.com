export type ProductLabelColor =
  | "lime"
  | "red"
  | "yellow"
  | "blue"
  | "purple"
  | "gray";

const CLASSES: Record<ProductLabelColor, string> = {
  lime: "bg-lime-primary/95 text-black",
  red: "bg-danger/90 text-white",
  yellow: "bg-warning/90 text-white",
  blue: "bg-info/90 text-white",
  purple: "bg-purple-500/90 text-white",
  gray: "bg-surface/95 text-foreground border border-border",
};

export function labelColorClasses(color: ProductLabelColor): string {
  return CLASSES[color];
}

export const ALL_LABEL_COLORS: ProductLabelColor[] = [
  "lime",
  "red",
  "yellow",
  "blue",
  "purple",
  "gray",
];
