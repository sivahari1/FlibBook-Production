import { createClient } from "@supabase/supabase-js";

export const supabaseServer = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-only
  { auth: { persistSession: false } }
);

export function inferContentTypeFromPath(path: string) {
  const p = path.toLowerCase();
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
  if (p.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

export async function deleteFromStorage(bucket: string, path: string) {
  const { error } = await supabaseServer.storage.from(bucket).remove([path]);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function generateSignedUrl(bucket: string, path: string, expiresInSec: number) {
  const { data, error } = await supabaseServer.storage.from(bucket).createSignedUrl(path, expiresInSec);
  if (error || !data?.signedUrl) return { ok: false as const, error: error?.message ?? "No signed URL returned" };
  return { ok: true as const, signedUrl: data.signedUrl };
}

