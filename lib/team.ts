import "server-only";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/cache";

export interface TeamMember {
  id: string;
  name: string;
  nameEn: string;
  role: string;
  roleEn: string;
  bio: string;
  bioEn: string;
  imageUrl: string | null;
  active: boolean;
}

async function fetchTeam(onlyActive: boolean): Promise<TeamMember[]> {
  let query = supabaseAdmin()
    .from("team_members")
    .select("id, name, name_en, role, role_en, bio, bio_en, image_url, active")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (onlyActive) query = query.eq("active", true);
  const { data } = await query;
  return (data ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    nameEn: m.name_en ?? "",
    role: m.role ?? "",
    roleEn: m.role_en ?? "",
    bio: m.bio ?? "",
    bioEn: m.bio_en ?? "",
    imageUrl: m.image_url,
    active: m.active,
  }));
}

/** Members shown on the About page (cached; edits in the admin expire it right away). */
export const getPublicTeam = unstable_cache(() => fetchTeam(true), ["about-team"], {
  tags: [CACHE_TAGS.team],
  revalidate: 300,
});

/** Everyone, hidden members included (admin screen, never cached). */
export const getAllTeam = () => fetchTeam(false);
