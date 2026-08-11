import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

export type MediaLocation = "meals_carousel" | "events_carousel" | "about_hero";

export interface MediaItem {
  id: string;
  url: string;
}

export async function getMediaByLocation(location: MediaLocation): Promise<MediaItem[]> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("site_media")
    .select("id, image_url")
    .eq("location", location)
    .order("sort_order", { ascending: true });

  return (data ?? []).map((row) => ({ id: row.id, url: row.image_url }));
}
