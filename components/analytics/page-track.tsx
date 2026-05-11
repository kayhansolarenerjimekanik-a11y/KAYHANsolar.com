"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { trackEvent } from "@/lib/analytics/client";

export function PageTrack() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname.startsWith("/kayhan-yonetim")) return;
    trackEvent({
      type: "page_view",
      pageUrl: pathname,
    });
  }, [pathname]);
  return null;
}
