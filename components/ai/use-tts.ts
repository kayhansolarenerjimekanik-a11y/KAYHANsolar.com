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
  const [supported, setSupported] = useState(false);
  const turkishVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    // SSR hydration guard — mark TTS available client-side
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(true);
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
    if (!supported) return;
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
  }, [supported]);

  const pause = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.pause();
    setStatus("paused");
  }, [supported]);

  const resume = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.resume();
    setStatus("speaking");
  }, [supported]);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setStatus("idle");
  }, [supported]);

  return {
    status,
    speak,
    pause,
    resume,
    stop,
    supported,
  };
}
