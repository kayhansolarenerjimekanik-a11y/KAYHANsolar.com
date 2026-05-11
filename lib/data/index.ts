import { demoRepository } from "./demo-repository";
import type { Repository } from "./repository";
import { supabaseRepository } from "./supabase-repository";

function pickRepository(): Repository {
  const mode = process.env.DATA_MODE ?? "demo";
  if (mode === "supabase") return supabaseRepository;
  return demoRepository;
}

export const repo: Repository = pickRepository();

export type { Repository };
export * from "./types";
