"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createUploadTicket, deleteImage, type UploadTicket } from "@/lib/storage";
import type { MediaLocation } from "@/lib/media";

const VALID_LOCATIONS: MediaLocation[] = ["meals_carousel", "events_carousel", "about_hero", "home_carousel"];

function revalidateMediaPaths() {
  revalidatePath("/admin/media");
  revalidatePath("/meals");
  revalidatePath("/en/meals");
  revalidatePath("/events");
  revalidatePath("/en/events");
  revalidatePath("/about");
  revalidatePath("/en/about");
  revalidatePath("/");
  revalidatePath("/en");
}

// See lib/storage.ts: the file bytes go straight from the browser to
// Supabase Storage via a signed URL, never through this server — Vercel's
// serverless body-size ceiling would otherwise silently reject real photos.
export async function getMediaUploadTicket(location: string, filename: string): Promise<UploadTicket | null> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return null;
  if (!VALID_LOCATIONS.includes(location as MediaLocation)) return null;
  return createUploadTicket(`site/${location}`, filename);
}

export async function attachMedia(location: string, url: string): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  if (!VALID_LOCATIONS.includes(location as MediaLocation) || !url) return;
  const db = supabaseAdmin();

  // About only ever shows a single hero photo — replace rather than accumulate.
  if (location === "about_hero") {
    const { data: existing } = await db
      .from("site_media")
      .select("id, image_url")
      .eq("location", location);
    for (const row of existing ?? []) {
      await deleteImage(row.image_url);
      await db.from("site_media").delete().eq("id", row.id);
    }
  }

  await db.from("site_media").insert({ location, image_url: url });
  revalidateMediaPaths();
}

export async function deleteMedia(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();

  const id = String(formData.get("id") ?? "");
  const url = String(formData.get("url") ?? "");
  if (!id || !url) return;

  await db.from("site_media").delete().eq("id", id);
  await deleteImage(url);

  revalidateMediaPaths();
}
