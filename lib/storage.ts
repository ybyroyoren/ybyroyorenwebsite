import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

export const IMAGE_BUCKET = "images";
const PUBLIC_PATH_MARKER = `/object/public/${IMAGE_BUCKET}/`;

export interface UploadTicket {
  path: string;
  token: string;
  publicUrl: string;
}

// Vercel's serverless functions have a hard request-body ceiling (~4.5MB)
// that next.config.ts's serverActions.bodySizeLimit cannot override — real
// photos routinely exceed it, so uploading the file THROUGH a Server Action
// silently fails for anything but small images. Instead we hand the browser
// a short-lived signed upload URL and let it PUT the file straight to
// Supabase Storage; only this tiny ticket request and the resulting public
// URL (recorded via a separate call) ever pass through our server.
export async function createUploadTicket(folder: string, filename: string): Promise<UploadTicket> {
  const db = supabaseAdmin();
  const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { data, error } = await db.storage.from(IMAGE_BUCKET).createSignedUploadUrl(path);
  if (error) throw new Error(error.message);

  const { data: pub } = db.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return { path, token: data.token, publicUrl: pub.publicUrl };
}

export async function deleteImage(publicUrl: string): Promise<void> {
  const idx = publicUrl.indexOf(PUBLIC_PATH_MARKER);
  if (idx === -1) return;
  const path = publicUrl.slice(idx + PUBLIC_PATH_MARKER.length);

  const db = supabaseAdmin();
  await db.storage.from(IMAGE_BUCKET).remove([path]);
}
