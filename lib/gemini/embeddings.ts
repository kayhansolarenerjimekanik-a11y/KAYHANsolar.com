import "server-only";

import { GEMINI_EMBEDDING_MODEL, getGemini } from "./client";

export async function embed(text: string): Promise<number[]> {
  const model = getGemini().getGenerativeModel({
    model: GEMINI_EMBEDDING_MODEL,
  });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (const t of texts) {
    out.push(await embed(t));
  }
  return out;
}
