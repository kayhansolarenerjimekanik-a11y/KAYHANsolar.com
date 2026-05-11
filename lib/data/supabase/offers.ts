// lib/data/supabase/offers.ts
import "server-only";
import { adminSupabase } from "@/lib/supabase/admin";
import { offerToInsert, rowToOffer } from "../mappers";
import type { Offer, OfferStatus } from "../types";

export async function listOffers(status?: OfferStatus): Promise<Offer[]> {
  let q = adminSupabase.from("offers").select("*").order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(rowToOffer);
}

export async function getOfferById(id: string): Promise<Offer | null> {
  const { data, error } = await adminSupabase.from("offers").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? rowToOffer(data) : null;
}
