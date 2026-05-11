import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";

let cached: GoogleGenerativeAI | null = null;

export function getGemini(): GoogleGenerativeAI {
  if (cached) return cached;
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not set in env.");
  }
  cached = new GoogleGenerativeAI(key);
  return cached;
}

export const GEMINI_CHAT_MODEL = "gemini-2.5-flash";
export const GEMINI_EMBEDDING_MODEL = "gemini-embedding-001";
export const GEMINI_EMBEDDING_DIMENSIONS = 768;
