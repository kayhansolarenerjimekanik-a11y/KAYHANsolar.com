"use client";

import { Copy, Share2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface ShareActionsProps {
  productName: string;
  url: string;
}

export function ShareActions({ productName, url }: ShareActionsProps) {
  const [mounted, setMounted] = useState(false);
  const [hasNativeShare, setHasNativeShare] = useState(false);
  const [hasClipboard, setHasClipboard] = useState(false);

  useEffect(() => {
    // SSR hydration guard — feature detection only runs on client
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setHasNativeShare(typeof navigator !== "undefined" && "share" in navigator);
    setHasClipboard(
      typeof navigator !== "undefined" &&
        typeof navigator.clipboard?.writeText === "function",
    );
  }, []);

  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(
    `${productName} — ${url}`,
  )}`;

  async function handleNativeShare() {
    try {
      await navigator.share({ title: productName, url });
    } catch {
      /* user cancel — sessizce yut */
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link kopyalandı");
    } catch {
      toast.error("Kopyalama başarısız");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
      <span className="font-medium">Paylaş:</span>

      {mounted && hasNativeShare && (
        <Button variant="outline" size="sm" onClick={handleNativeShare}>
          <Share2 className="h-3.5 w-3.5" strokeWidth={2.2} />
          Paylaş
        </Button>
      )}

      {mounted && hasClipboard && (
        <Button variant="outline" size="sm" onClick={handleCopy}>
          <Copy className="h-3.5 w-3.5" strokeWidth={2.2} />
          Linki Kopyala
        </Button>
      )}

      <Link href={whatsappShareUrl} target="_blank" rel="noopener noreferrer">
        <Button variant="outline" size="sm">
          WhatsApp
        </Button>
      </Link>
    </div>
  );
}
