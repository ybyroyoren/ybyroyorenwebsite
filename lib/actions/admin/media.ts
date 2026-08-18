"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { deleteImage, uploadImage } from "@/lib/storage";
import type { MediaLocation } from "@/lib/media";

const VALID_LOCATIONS: MediaLocation[] = ["meals_carousel", "events_carousel", "about_hero", "home_carousel"];

export async function uploadMedia(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();

  const location = String(formData.get("location") ?? "") as MediaLocation;
  const file = formData.get("image");
  if (!VALID_LOCATIONS.includes(location) || !(file instanceof File) || file.size === 0) return;

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

  const url = await uploadImage(file, `site/${location}`);
  await db.from("site_media").insert({ location, image_url: url });

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

export async function deleteMedia(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();

  const id = String(formData.get("id") ?? "");
  const url = String(formData.get("url") ?? "");
  if (!id || !url) return;

  await db.from("site_media").delete().eq("id", id);
  await deleteImage(url);

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
