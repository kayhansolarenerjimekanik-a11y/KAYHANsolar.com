import "server-only";

import {
  GEMINI_EMBEDDING_DIMENSIONS,
  GEMINI_EMBEDDING_MODEL,
  getGemini,
} from "./client";

export async function embed(text: string): Promise<number[]> {
  const model = getGemini().getGenerativeModel({
    model: GEMINI_EMBEDDING_MODEL,
  });
  // outputDimensionality is supported at runtime by gemini-embedding-001
  // but missing from SDK type definitions in @google/generative-ai 0.24.x.
  const result = await model.embedContent({
    content: { parts: [{ text }], role: "user" },
    outputDimensionality: GEMINI_EMBEDDING_DIMENSIONS,
  } as Parameters<typeof model.embedContent>[0]);
  return result.embedding.values;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (const t of texts) {
    out.push(await embed(t));
  }
  return out;
}
