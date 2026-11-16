"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { expireTeam } from "@/lib/cache";
import { movedOrder, parseIds } from "@/lib/reorder";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createUploadTicket, deleteImage, type UploadTicket } from "@/lib/storage";

// The people shown in the "team" section of the About page. Owner only.

async function owner(): Promise<boolean> {
  return (await requireAdmin()).role === "owner";
}

function done() {
  expireTeam();
  revalidatePath("/admin/about-team");
}

const text = (formData: FormData, name: string, max: number) => String(formData.get(name) ?? "").trim().slice(0, max);

export async function addTeamMember(formData: FormData): Promise<void> {
  if (!(await owner())) return;
  const name = text(formData, "name", 80);
  if (!name) return;
  const db = supabaseAdmin();
  const { data: last } = await db.from("team_members").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  await db.from("team_members").insert({
    name,
    name_en: text(formData, "nameEn", 80),
    role: text(formData, "role", 80),
    role_en: text(formData, "roleEn", 80),
    bio: text(formData, "bio", 1200),
    bio_en: text(formData, "bioEn", 1200),
    sort_order: (last?.sort_order ?? -1) + 1,
  });
  done();
}

export async function updateTeamMember(formData: FormData): Promise<void> {
  if (!(await owner())) return;
  const id = text(formData, "id", 60);
  const name = text(formData, "name", 80);
  if (!id || !name) return;
  await supabaseAdmin()
    .from("team_members")
    .update({
      name,
      name_en: text(formData, "nameEn", 80),
      role: text(formData, "role", 80),
      role_en: text(formData, "roleEn", 80),
      bio: text(formData, "bio", 1200),
      bio_en: text(formData, "bioEn", 1200),
      active: formData.get("active") === "on",
    })
    .eq("id", id);
  done();
}

export async function deleteTeamMember(formData: FormData): Promise<void> {
  if (!(await owner())) return;
  const id = text(formData, "id", 60);
  if (!id) return;
  const db = supabaseAdmin();
  const { data: member } = await db.from("team_members").select("image_url").eq("id", id).maybeSingle();
  await db.from("team_members").delete().eq("id", id);
  if (member?.image_url) await deleteImage(member.image_url);
  done();
}

/** Position in the list (the order on the About page). `order` = the member ids as currently listed. */
export async function moveTeamMember(formData: FormData): Promise<void> {
  if (!(await owner())) return;
  const next = movedOrder(parseIds(formData.get("order")), text(formData, "id", 60), text(formData, "direction", 10));
  if (!next) return;
  const db = supabaseAdmin();
  await Promise.all(next.map((id, i) => db.from("team_members").update({ sort_order: i }).eq("id", id)));
  done();
}

// Photos go straight from the browser to storage (see lib/storage.ts); these two calls only hand out the ticket and
// record the resulting URL (replacing, and deleting, the member's previous photo).
export async function getTeamImageTicket(memberId: string, filename: string): Promise<UploadTicket | null> {
  if (!(await owner()) || !memberId) return null;
  return createUploadTicket("site/team", filename);
}

export async function attachTeamImage(memberId: string, url: string): Promise<void> {
  if (!(await owner()) || !memberId || !url) return;
  const db = supabaseAdmin();
  const { data: member } = await db.from("team_members").select("image_url").eq("id", memberId).maybeSingle();
  await db.from("team_members").update({ image_url: url }).eq("id", memberId);
  if (member?.image_url && member.image_url !== url) await deleteImage(member.image_url);
  done();
}

export async function removeTeamImage(formData: FormData): Promise<void> {
  if (!(await owner())) return;
  const id = text(formData, "id", 60);
  if (!id) return;
  const db = supabaseAdmin();
  const { data: member } = await db.from("team_members").select("image_url").eq("id", id).maybeSingle();
  await db.from("team_members").update({ image_url: null }).eq("id", id);
  if (member?.image_url) await deleteImage(member.image_url);
  done();
}
