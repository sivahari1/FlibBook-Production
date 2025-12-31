// lib/supabase/server.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function supabaseServer(): SupabaseClient {
  if (_client) return _client;

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Runtime validation with clear error messages
  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL environment variable is required but not set. Please configure it in your Vercel environment variables.");
  }
  
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is required but not set. Please configure it in your Vercel environment variables.");
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

export async function generateSignedUrl(bucket: string, path: string, expiresIn: number = 3600) {
  const client = supabaseServer();
  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  
  if (error || !data?.signedUrl) {
    return { ok: false as const, error: error?.message || "Failed to generate signed URL" };
  }

  return { ok: true as const, signedUrl: data.signedUrl };
}

export async function uploadToStorage(bucket: string, path: string, file: File | Buffer, options?: { contentType?: string }) {
  const client = supabaseServer();
  const { data, error } = await client.storage
    .from(bucket)
    .upload(path, file, {
      contentType: options?.contentType,
      upsert: true
    });
  
  if (error) {
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const, path: data.path };
}

export function inferContentTypeFromPath(path: string) {
  const p = path.toLowerCase();
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
  if (p.endsWith(".webp")) return "image/webp";
  if (p.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}
