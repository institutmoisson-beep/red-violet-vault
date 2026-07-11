import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, { url: string; exp: number }>();

/** Resolve a signed URL for a private bucket path. `path` may be `bucket/key` or full public url. */
export async function signedUrl(bucket: string, key: string | null, ttl = 3600): Promise<string | null> {
  if (!key) return null;
  if (key.startsWith("http")) return key;
  const cacheKey = `${bucket}/${key}`;
  const now = Date.now();
  const hit = cache.get(cacheKey);
  if (hit && hit.exp > now + 60_000) return hit.url;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(key, ttl);
  if (error || !data?.signedUrl) return null;
  cache.set(cacheKey, { url: data.signedUrl, exp: now + ttl * 1000 });
  return data.signedUrl;
}

export async function uploadFile(bucket: string, path: string, file: File): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}
