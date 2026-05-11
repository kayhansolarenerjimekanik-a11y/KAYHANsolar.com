import { Badge } from "@/components/ui/badge";
import type { OfferStatus } from "@/lib/data/types";

const map: Record<
  OfferStatus,
  { label: string; tone: "warning" | "info" | "success" | "neutral" }
> = {
  new: { label: "Yeni", tone: "warning" },
  in_review: { label: "İnceleniyor", tone: "info" },
  responded: { label: "Yanıtlandı", tone: "success" },
  closed: { label: "Kapalı", tone: "neutral" },
};

export function OfferStatusPill({ status }: { status: OfferStatus }) {
  const m = map[status];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
