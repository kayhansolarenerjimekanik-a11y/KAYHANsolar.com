import "server-only";

import { GEMINI_CHAT_MODEL, getGemini } from "./client";
import { retrieveContext } from "./rag";
import { KAYHAN_SYSTEM_PROMPT, buildContextBlock } from "./system-prompt";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export async function* streamChat(
  history: ChatTurn[],
  question: string,
): AsyncGenerator<string, void, unknown> {
  const context = await retrieveContext(question, 5);
  const systemInstruction =
    KAYHAN_SYSTEM_PROMPT + buildContextBlock(context);

  const model = getGemini().getGenerativeModel({
    model: GEMINI_CHAT_MODEL,
    systemInstruction,
  });

  const chat = model.startChat({
    history: history.map((t) => ({
      role: t.role === "user" ? "user" : "model",
      parts: [{ text: t.content }],
    })),
  });

  const stream = await chat.sendMessageStream(question);
  for await (const chunk of stream.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}
