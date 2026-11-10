import "server-only";
import { createClient } from "@/lib/supabase/server";

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const DOC_TYPES = [
  "application/pdf", "image/png", "image/jpeg", "image/webp",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv", "application/zip",
];

function safeName(name: string) {
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) : "bin";
  return `${crypto.randomUUID()}.${ext || "bin"}`;
}

export class UploadError extends Error {}

/**
 * Upload with the signed-in user's session: Storage RLS policies decide whether
 * the path is allowed (see migration 7). Validates type and size server-side.
 */
export async function uploadFile(bucket: "public-assets" | "private-files", folder: string, file: File, kind: "image" | "document") {
  const allowed = kind === "image" ? IMAGE_TYPES : DOC_TYPES;
  const max = kind === "image" ? MAX_IMAGE_BYTES : MAX_FILE_BYTES;
  if (!allowed.includes(file.type)) throw new UploadError("mime type not allowed");
  if (file.size > max) throw new UploadError("file size exceeded the maximum");
  const supabase = await createClient();
  const path = `${folder}/${safeName(file.name)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return { path, name: file.name.slice(0, 200), size: file.size, type: file.type };
}

export function publicUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/public-assets/${path}`;
}
