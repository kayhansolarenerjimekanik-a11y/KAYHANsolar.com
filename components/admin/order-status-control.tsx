"use client";

import { useTransition } from "react";

import { updateOrderStatusAction } from "@/app/(admin)/kayhan-yonetim/actions/orders";
import { Select } from "@/components/ui/select";
import type { OrderStatus } from "@/lib/data/types";

const labels: Record<OrderStatus, string> = {
  pending: "Beklemede",
  whatsapp_sent: "WhatsApp Gönderildi",
  confirmed: "Onaylandı",
  preparing: "Hazırlanıyor",
  shipped: "Kargolandı",
  delivered: "Teslim Edildi",
  cancelled: "İptal",
};

export function OrderStatusControl({
  orderId,
  current,
}: {
  orderId: string;
  current: OrderStatus;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      value={current}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as OrderStatus;
        startTransition(async () => {
          await updateOrderStatusAction(orderId, next);
        });
      }}
      className="h-8 px-2 text-xs"
    >
      {(Object.keys(labels) as OrderStatus[]).map((s) => (
        <option key={s} value={s}>
          {labels[s]}
        </option>
      ))}
    </Select>
  );
}
