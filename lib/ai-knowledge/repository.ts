import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

import type { AIKnowledgeChunk, AIKnowledgeMatch } from "./types";

interface InsertChunk {
  title: string;
  content: string;
  sourceType: "manual" | "url" | "pdf" | "text";
  sourceUrl?: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
}

export async function listChunks(): Promise<AIKnowledgeChunk[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = getSupabaseAdminClient() as any;
  const { data, error } = await client
    .from("ai_knowledge")
    .select("id,title,content,source_type,source_url,metadata,is_active,created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    title: row.title as string,
    content: row.content as string,
    sourceType: row.source_type as AIKnowledgeChunk["sourceType"],
    sourceUrl: (row.source_url as string | null) ?? undefined,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
  }));
}

export async function insertChunks(chunks: InsertChunk[]): Promise<void> {
  if (chunks.length === 0) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = getSupabaseAdminClient() as any;
  const rows = chunks.map((c) => ({
    title: c.title,
    content: c.content,
    source_type: c.sourceType,
    source_url: c.sourceUrl,
    embedding: c.embedding,
    metadata: c.metadata ?? {},
  }));
  const { error } = await client.from("ai_knowledge").insert(rows);
  if (error) throw new Error(error.message);
}

export async function deleteChunk(id: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = getSupabaseAdminClient() as any;
  const { error } = await client.from("ai_knowledge").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function matchChunks(
  queryEmbedding: number[],
  k = 5,
): Promise<AIKnowledgeMatch[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = getSupabaseAdminClient() as any;
  const { data, error } = await client.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_threshold: 0.6,
    match_count: k,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as AIKnowledgeMatch[];
}
