import { supabase } from "@/integrations/supabase/client";

export type MediaKind = "image" | "video" | "document";

const BUCKETS: Record<MediaKind | "voice", string> = {
  image: "studentpov-images",
  video: "studentpov-videos",
  document: "studentpov-documents",
  voice: "studentpov-voice",
};

export function detectMediaKind(file: File): MediaKind {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "document";
}

export async function uploadMedia(opts: {
  userId: string;
  file: Blob;
  kind: MediaKind | "voice";
  ext?: string;
}): Promise<string> {
  const bucket = BUCKETS[opts.kind];
  const ext =
    opts.ext ??
    ((opts.file as File).name?.split(".").pop() || (opts.kind === "voice" ? "webm" : "bin"));
  const path = `${opts.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, opts.file, {
    cacheControl: "3600",
    upsert: false,
    contentType: (opts.file as File).type || undefined,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
