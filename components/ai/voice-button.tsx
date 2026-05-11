"use client";

import { Pause, Play, Volume2 } from "lucide-react";

import { useTts } from "./use-tts";

interface Props {
  text: string;
}

export function VoiceButton({ text }: Props) {
  const tts = useTts();
  if (!tts.supported) return null;

  if (tts.status === "speaking") {
    return (
      <button
        type="button"
        onClick={tts.pause}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-muted hover:bg-elevated"
      >
        <Pause className="h-3 w-3" strokeWidth={2.4} />
        Duraklat
      </button>
    );
  }
  if (tts.status === "paused") {
    return (
      <button
        type="button"
        onClick={tts.resume}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-muted hover:bg-elevated"
      >
        <Play className="h-3 w-3" strokeWidth={2.4} />
        Devam
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => tts.speak(text)}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-muted hover:bg-elevated"
    >
      <Volume2 className="h-3 w-3" strokeWidth={2.4} />
      Sesli oku
    </button>
  );
}
