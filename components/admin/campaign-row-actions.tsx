"use client";

import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { deleteCampaignAction } from "@/app/(admin)/kayhan-yonetim/actions/campaigns";
import { Button } from "@/components/ui/button";

interface Props {
  id: string;
  title: string;
}

export function CampaignRowActions({ id, title }: Props) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <div className="flex items-center justify-end gap-2">
        <form action={deleteCampaignAction.bind(null, id)}>
          <Button type="submit" variant="danger" size="sm">
            Sil
          </Button>
        </form>
        <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
          İptal
        </Button>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-end gap-1.5">
      <Link href={`/kayhan-yonetim/kampanyalar/${id}`}>
        <Button variant="ghost" size="sm" aria-label={`${title} düzenle`}>
          <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} />
        </Button>
      </Link>
      <Button
        variant="ghost"
        size="sm"
        aria-label={`${title} sil`}
        onClick={() => setConfirming(true)}
      >
        <Trash2 className="h-3.5 w-3.5 text-danger" strokeWidth={2.2} />
      </Button>
    </div>
  );
}
