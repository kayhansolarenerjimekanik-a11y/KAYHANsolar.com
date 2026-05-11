import "server-only";

import { matchChunks } from "@/lib/ai-knowledge/repository";

import { embed } from "./embeddings";

export async function retrieveContext(
  query: string,
  k = 5,
): Promise<{ content: string; title: string; similarity: number }[]> {
  if (query.trim().length < 3) return [];
  try {
    const queryEmbedding = await embed(query);
    return await matchChunks(queryEmbedding, k);
  } catch (err) {
    console.error("[rag] retrieveContext failed", err);
    return [];
  }
}
