"use client";

import { MessageCircle, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { ChatPanel } from "./chat-panel";

export function ChatFab() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Hide on admin routes
  if (pathname.startsWith("/kayhan-yonetim")) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Sohbeti kapat" : "Asistanı aç"}
        className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-lime-primary text-black shadow-xl shadow-lime-primary/30 transition-transform hover:scale-105 sm:bottom-6 sm:right-6"
      >
        {open ? (
          <X className="h-6 w-6" strokeWidth={2.4} />
        ) : (
          <MessageCircle className="h-6 w-6" strokeWidth={2.2} />
        )}
      </button>
      <ChatPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
