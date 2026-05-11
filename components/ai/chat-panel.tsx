"use client";

import { Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ChatMessage } from "./chat-message";
import { useChat } from "./use-chat";

interface Props {
  open: boolean;
  onClose: () => void;
}

const STARTER_PROMPTS = [
  "Aylık 500 kWh için kaç panel gerekir?",
  "Bataryalı sistem ile şebekeden ne fark eder?",
  "Bahar kampanyasının detayı nedir?",
];

export function ChatPanel({ open, onClose }: Props) {
  const { messages, sending, send, reset } = useChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  if (!open) return null;

  function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setInput("");
    send(trimmed);
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[60] flex justify-end px-0 pb-0 sm:inset-auto sm:bottom-24 sm:right-6 sm:px-0"
      role="dialog"
      aria-label="KAYHAN Asistan"
    >
      <div className="glass-strong relative flex h-[85vh] w-full flex-col rounded-t-3xl border-t border-border sm:h-[640px] sm:w-[400px] sm:rounded-3xl sm:border">
        <header className="flex items-center justify-between gap-2 border-b border-border bg-surface/80 px-4 py-3 sm:rounded-t-3xl">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-lime-primary text-black">
              <Sparkles className="h-4 w-4" strokeWidth={2.4} />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight">
                KAYHAN Asistan
              </p>
              <p className="text-[10px] text-muted">
                Güneş enerjisi soruları için yapay zeka
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sohbeti kapat"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-elevated hover:text-foreground"
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </header>

        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
        >
          {messages.length === 0 ? (
            <div className="space-y-3">
              <p className="text-xs text-muted">
                Aşağıdaki örnek sorulardan biriyle başlayabilir veya kendi
                sorunuzu yazabilirsiniz.
              </p>
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleSend(p)}
                  className="block w-full rounded-xl border border-border bg-surface px-3 py-2 text-left text-xs text-foreground hover:border-lime-primary"
                >
                  {p}
                </button>
              ))}
            </div>
          ) : (
            messages.map((m) => <ChatMessage key={m.id} message={m} />)
          )}
        </div>

        <footer className="border-t border-border bg-surface/80 px-3 py-3 sm:rounded-b-3xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Sorunuzu yazın..."
              disabled={sending}
              className="h-10 flex-1 rounded-xl border border-border bg-elevated px-3 text-sm text-foreground placeholder:text-subtle focus:border-lime-primary focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={sending || input.trim().length === 0}
              aria-label="Gönder"
              className="grid h-10 w-10 place-items-center rounded-xl bg-lime-primary text-black transition-opacity disabled:opacity-50"
            >
              <Send className="h-4 w-4" strokeWidth={2.4} />
            </button>
          </form>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={reset}
              className="mt-2 text-[10px] text-subtle underline hover:text-muted"
            >
              Sohbeti sıfırla
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
