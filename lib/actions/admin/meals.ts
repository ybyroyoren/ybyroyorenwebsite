"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function createMeal(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const totalSeats = Number(formData.get("totalSeats") ?? 0);
  const pricePerSeat = Number(formData.get("pricePerSeat") ?? 0);
  const menuText = String(formData.get("menu") ?? "");

  if (!title || !date || !(totalSeats > 0) || !(pricePerSeat >= 0)) return;

  const menu = menuText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((name) => ({ name, note: "" }));

  await db.from("meals").insert({
    title,
    description,
    date,
    total_seats: totalSeats,
    price_per_seat: pricePerSeat,
    menu,
  });

  revalidatePath("/admin/meals");
}

export async function closeMeal(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.from("meals").update({ status: "closed" }).eq("id", id);
  revalidatePath("/admin/meals");
}

export async function reopenMeal(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.from("meals").update({ status: "open" }).eq("id", id);
  revalidatePath("/admin/meals");
}

export async function deleteMeal(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.from("meals").delete().eq("id", id);
  revalidatePath("/admin/meals");
}
