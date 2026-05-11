export interface AIKnowledgeChunk {
  id: string;
  title: string;
  content: string;
  sourceType: "manual" | "url" | "pdf" | "text";
  sourceUrl?: string;
  metadata?: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
}

export interface AIKnowledgeMatch {
  id: string;
  title: string;
  content: string;
  similarity: number;
}
