// lib/supabase/server.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function supabaseServer(): SupabaseClient {
  if (_client) return _client;

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // DO NOT throw at module import time; only throw when this function is called.
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  _client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  return _client;
}

export async function downloadFromStorage(bucket: string, path: string) {
  const client = supabaseServer();
  const { data, error } = await client.storage.from(bucket).download(path);
  if (error || !data) {
    return { ok: false as const, error: error?.message || "Download failed" };
  }

  const arrayBuffer = await data.arrayBuffer();
  return { ok: true as const, arrayBuffer };
}

export function inferContentTypeFromPath(path: string) {
  const p = path.toLowerCase();
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
  if (p.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}
