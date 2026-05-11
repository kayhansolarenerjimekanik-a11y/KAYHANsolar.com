"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function stripMarkdownAndEmoji(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface TtsState {
  status: "idle" | "speaking" | "paused";
  speak: (text: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  supported: boolean;
}

export function useTts(): TtsState {
  const [status, setStatus] = useState<"idle" | "speaking" | "paused">("idle");
  const supportedRef = useRef(false);
  const turkishVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    supportedRef.current = true;
    const load = () => {
      const voices = window.speechSynthesis.getVoices();
      turkishVoiceRef.current =
        voices.find((v) => v.lang.toLowerCase().startsWith("tr")) ?? null;
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const speak = useCallback((text: string) => {
    if (!supportedRef.current) return;
    const clean = stripMarkdownAndEmoji(text);
    if (!clean) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = "tr-TR";
    u.rate = 1.0;
    if (turkishVoiceRef.current) u.voice = turkishVoiceRef.current;
    u.onend = () => setStatus("idle");
    u.onerror = () => setStatus("idle");
    setStatus("speaking");
    window.speechSynthesis.speak(u);
  }, []);

  const pause = useCallback(() => {
    if (!supportedRef.current) return;
    window.speechSynthesis.pause();
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    if (!supportedRef.current) return;
    window.speechSynthesis.resume();
    setStatus("speaking");
  }, []);

  const stop = useCallback(() => {
    if (!supportedRef.current) return;
    window.speechSynthesis.cancel();
    setStatus("idle");
  }, []);

  return {
    status,
    speak,
    pause,
    resume,
    stop,
    supported: supportedRef.current,
  };
}
