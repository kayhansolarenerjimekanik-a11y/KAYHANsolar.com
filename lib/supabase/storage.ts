import "server-only";
import { getSupabaseAdminClient } from "./admin";

type Bucket = "product-media" | "gallery-media" | "offer-media";

export async function uploadFile(
  bucket: Bucket,
  path: string,
  file: ArrayBuffer | Uint8Array | Blob,
  contentType: string,
): Promise<{ publicUrl: string }> {
  const client = getSupabaseAdminClient();
  const { error } = await client.storage.from(bucket).upload(path, file, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return { publicUrl: data.publicUrl };
}
