"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { deleteChunk, insertChunks } from "@/lib/ai-knowledge/repository";
import { chunkText } from "@/lib/gemini/chunker";
import { embed } from "@/lib/gemini/embeddings";

export interface AIKnowledgeActionState {
  error?: string;
  successMessage?: string;
}

const uploadSchema = z.object({
  title: z.string().min(2).max(200),
  body: z.string().min(20).max(50_000),
});

export async function uploadKnowledgeAction(
  _prev: AIKnowledgeActionState,
  formData: FormData,
): Promise<AIKnowledgeActionState> {
  await requireAdmin();
  const parsed = uploadSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  try {
    const chunks = chunkText(parsed.data.body);
    const inserts = await Promise.all(
      chunks.map(async (content) => ({
        title: parsed.data.title,
        content,
        sourceType: "manual" as const,
        embedding: await embed(content),
      })),
    );
    await insertChunks(inserts);
    revalidatePath("/kayhan-yonetim/ai-egitim");
    return {
      successMessage: `${chunks.length} parça eklendi.`,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Yükleme başarısız",
    };
  }
}

export async function deleteKnowledgeAction(id: string): Promise<void> {
  await requireAdmin();
  await deleteChunk(id);
  revalidatePath("/kayhan-yonetim/ai-egitim");
}
