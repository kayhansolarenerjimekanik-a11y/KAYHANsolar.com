"use client";

import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { deleteProductAction } from "@/app/(admin)/kayhan-yonetim/actions/products";
import { Button } from "@/components/ui/button";

interface Props {
  productId: string;
  productName: string;
}

export function ProductRowActions({ productId, productName }: Props) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex items-center justify-end gap-2">
        <form action={deleteProductAction.bind(null, productId)}>
          <Button type="submit" variant="danger" size="sm">
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
            Sil
          </Button>
        </form>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
        >
          İptal
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Link href={`/kayhan-yonetim/urunler/${productId}`}>
        <Button variant="ghost" size="sm" aria-label={`${productName} düzenle`}>
          <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} />
        </Button>
      </Link>
      <Button
        variant="ghost"
        size="sm"
        aria-label={`${productName} sil`}
        onClick={() => setConfirming(true)}
      >
        <MoreVertical className="h-3.5 w-3.5" strokeWidth={2.2} />
      </Button>
    </div>
  );
}
