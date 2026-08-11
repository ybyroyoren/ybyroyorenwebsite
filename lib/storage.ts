import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

const BUCKET = "images";
const PUBLIC_PATH_MARKER = `/object/public/${BUCKET}/`;

export async function uploadImage(file: File, folder: string): Promise<string> {
  if (!file || file.size === 0) throw new Error("לא נבחר קובץ");
  if (!file.type.startsWith("image/")) throw new Error("יש להעלות קובץ תמונה");

  const db = supabaseAdmin();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await db.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const { data } = db.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteImage(publicUrl: string): Promise<void> {
  const idx = publicUrl.indexOf(PUBLIC_PATH_MARKER);
  if (idx === -1) return;
  const path = publicUrl.slice(idx + PUBLIC_PATH_MARKER.length);

  const db = supabaseAdmin();
  await db.storage.from(BUCKET).remove([path]);
}
