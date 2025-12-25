// lib/supabase/server.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

export const supabaseServer = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

export async function downloadFromStorage(bucket: string, path: string) {
  const { data, error } = await supabaseServer.storage.from(bucket).download(path);
  if (error || !data) {
    return { ok: false as const, error: error?.message || "Download failed" };
  }
  const arrayBuffer = await data.arrayBuffer();
  // Supabase download() doesn't always provide content-type; you can infer from extension
  return { ok: true as const, arrayBuffer };
}

export function inferContentTypeFromPath(path: string) {
  const p = path.toLowerCase();
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
  if (p.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}