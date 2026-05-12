// lib/data/supabase/offers.ts
import "server-only";
import { adminSupabase } from "@/lib/supabase/admin";
import { offerToInsert, rowToOffer } from "../mappers";
import type { Offer, OfferStatus } from "../types";
import { pushNotification } from "./notifications";

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

export async function createOffer(data: Omit<Offer, "id" | "status" | "createdAt">): Promise<Offer> {
  const { data: row, error } = await adminSupabase
    .from("offers")
    .insert(offerToInsert(data))
    .select()
    .single();
  if (error) throw error;
  const offer = rowToOffer(row);
  await pushNotification({
    type: "new_offer",
    title: "Yeni Teklif",
    message: `${offer.fullName} adlı müşteriden teklif`,
    relatedId: offer.id,
    relatedType: "offer",
  });
  return offer;
}

export async function updateOffer(id: string, patch: Partial<Offer>): Promise<Offer> {
  const update: Record<string, unknown> = {};
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.adminNotes !== undefined) update.admin_notes = patch.adminNotes;
  if (patch.adminResponse !== undefined) {
    update.admin_response = patch.adminResponse;
    update.responded_at = new Date().toISOString();
  }
  const { data: row, error } = await adminSupabase.from("offers").update(update).eq("id", id).select().single();
  if (error) throw error;
  return rowToOffer(row);
}
