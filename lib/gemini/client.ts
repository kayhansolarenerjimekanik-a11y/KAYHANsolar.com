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

export const GEMINI_CHAT_MODEL = "gemini-2.0-flash-exp";
export const GEMINI_EMBEDDING_MODEL = "text-embedding-004";
