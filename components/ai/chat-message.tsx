"use client";

import { Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { ChatMessage as ChatMessageType } from "./use-chat";
import { VoiceButton } from "./voice-button";

interface Props {
  message: ChatMessageType;
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
          isUser
            ? "bg-lime-primary text-black"
            : "border border-border bg-surface text-foreground"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1">
            {message.content.trim().length === 0 && message.pending ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted" strokeWidth={2.4} />
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        )}
        {!isUser && !message.pending && message.content && (
          <div className="mt-1 flex items-center justify-end gap-1">
            <VoiceButton text={message.content} />
          </div>
        )}
      </div>
    </div>
  );
}
