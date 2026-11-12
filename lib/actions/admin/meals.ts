"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { expireMeals } from "@/lib/cache";
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
  expireMeals();
}

export async function closeMeal(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.from("meals").update({ status: "closed" }).eq("id", id);
  revalidatePath("/admin/meals");
  expireMeals();
}

export async function reopenMeal(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.from("meals").update({ status: "open" }).eq("id", id);
  revalidatePath("/admin/meals");
  expireMeals();
}

export async function deleteMeal(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.from("meals").delete().eq("id", id);
  revalidatePath("/admin/meals");
  expireMeals();
}

const TEXT_MODES = ["auto", "open", "few", "exact", "full", "custom", "hidden"];
const METER_MODES = ["auto", "real", "hidden"];

/** How this meal's seats are shown on the public page: the text and the meter are chosen separately. */
export async function updateMealDisplay(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const id = String(formData.get("id") ?? "");
  const textMode = String(formData.get("textMode") ?? "auto");
  const meterMode = String(formData.get("meterMode") ?? "auto");
  if (!id || !TEXT_MODES.includes(textMode) || !METER_MODES.includes(meterMode)) return;

  await supabaseAdmin()
    .from("meals")
    .update({
      seats_text_mode: textMode,
      seats_text_he: String(formData.get("textHe") ?? "").trim().slice(0, 120),
      seats_text_en: String(formData.get("textEn") ?? "").trim().slice(0, 120),
      seats_meter_mode: meterMode,
    })
    .eq("id", id);
  revalidatePath("/admin/meals");
  expireMeals();
}
