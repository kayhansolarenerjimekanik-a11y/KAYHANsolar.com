"use client";

import { useCallback, useRef, useState } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
}

function genId(): string {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async (text: string) => {
    const userMsg: ChatMessage = { id: genId(), role: "user", content: text };
    const aiMsg: ChatMessage = {
      id: genId(),
      role: "assistant",
      content: "",
      pending: true,
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setSending(true);

    // Best-effort analytics for chat usage
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "chat_message" }),
      keepalive: true,
    }).catch(() => {
      /* ignore */
    });

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history, question: text }),
        signal: ctl.signal,
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "Yanıt alınamadı");
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsg.id
              ? { ...m, content: errText, pending: false }
              : m,
          ),
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsg.id ? { ...m, content: buffer } : m,
          ),
        );
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsg.id ? { ...m, pending: false } : m,
        ),
      );
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsg.id
            ? {
                ...m,
                content: "Bağlantı hatası. Lütfen tekrar deneyin.",
                pending: false,
              }
            : m,
        ),
      );
    } finally {
      setSending(false);
    }
  }, [messages]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
  }, []);

  return { messages, sending, send, reset };
}
