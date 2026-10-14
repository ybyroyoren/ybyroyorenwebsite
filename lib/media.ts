import "server-only";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/cache";

export type MediaLocation = "meals_carousel" | "events_carousel" | "about_hero" | "home_carousel";

export interface MediaItem {
  id: string;
  url: string;
}

export const getMediaByLocation = unstable_cache(
  async (location: MediaLocation): Promise<MediaItem[]> => {
    const db = supabaseAdmin();
    const { data } = await db
      .from("site_media")
      .select("id, image_url")
      .eq("location", location)
      .order("sort_order", { ascending: true });

    return (data ?? []).map((row) => ({ id: row.id, url: row.image_url }));
  },
  ["site-media"],
  { tags: [CACHE_TAGS.media], revalidate: 300 }
);
