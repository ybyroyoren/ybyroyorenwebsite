"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { KLEquipRef } from "@/lib/kitchen/types";

const BASE_PATH = "/admin/kitchen";

// ---------- suppliers ----------

export async function createSupplier(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const db = supabaseAdmin();
  await db.from("kl_suppliers").insert({
    name,
    note: String(formData.get("note") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
  });
  revalidatePath(`${BASE_PATH}/suppliers`);
}

export async function updateSupplier(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const db = supabaseAdmin();
  await db
    .from("kl_suppliers")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      note: String(formData.get("note") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
    })
    .eq("id", id);
  revalidatePath(`${BASE_PATH}/suppliers`);
}

export async function deleteSupplier(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // kl_ingredients.supplier_id is ON DELETE SET NULL — affected ingredients
  // just lose their supplier link, matching the spec's "unlink, don't block".
  const db = supabaseAdmin();
  await db.from("kl_suppliers").delete().eq("id", id);
  revalidatePath(`${BASE_PATH}/suppliers`);
  revalidatePath(`${BASE_PATH}/ingredients`);
}

// ---------- equipment ----------

export async function createEquipment(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const db = supabaseAdmin();
  await db.from("kl_equipment").insert({ name, note: String(formData.get("note") ?? "").trim() });
  revalidatePath(`${BASE_PATH}/equipment`);
}

export async function updateEquipment(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const db = supabaseAdmin();
  await db
    .from("kl_equipment")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      note: String(formData.get("note") ?? "").trim(),
    })
    .eq("id", id);
  revalidatePath(`${BASE_PATH}/equipment`);
}

export async function deleteEquipment(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const db = supabaseAdmin();

  // prep_equipment / event_equipment are JSONB arrays on kl_recipes, not FK
  // rows — strip references to the deleted equipment ourselves.
  const { data: recipes } = await db
    .from("kl_recipes")
    .select("id, prep_equipment, event_equipment");
  for (const r of recipes ?? []) {
    const prep = (r.prep_equipment as KLEquipRef[]).filter((e) => e.equipId !== id);
    const event = (r.event_equipment as KLEquipRef[]).filter((e) => e.equipId !== id);
    if (prep.length !== r.prep_equipment.length || event.length !== r.event_equipment.length) {
      await db.from("kl_recipes").update({ prep_equipment: prep, event_equipment: event }).eq("id", r.id);
    }
  }

  await db.from("kl_equipment").delete().eq("id", id);
  revalidatePath(`${BASE_PATH}/equipment`);
  revalidatePath(`${BASE_PATH}/recipes`);
}

// ---------- guests ----------

export async function createGuest(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const db = supabaseAdmin();
  await db.from("kl_guests").insert({
    name,
    phone: String(formData.get("phone") ?? "").trim(),
    restrictions: String(formData.get("restrictions") ?? "").trim(),
  });
  revalidatePath(`${BASE_PATH}/guests`);
}

export async function updateGuest(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const db = supabaseAdmin();
  await db
    .from("kl_guests")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      restrictions: String(formData.get("restrictions") ?? "").trim(),
    })
    .eq("id", id);
  revalidatePath(`${BASE_PATH}/guests`);
}

export async function deleteGuest(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // kl_event_guest_seats.guest_id is ON DELETE SET NULL — seat becomes unassigned.
  const db = supabaseAdmin();
  await db.from("kl_guests").delete().eq("id", id);
  revalidatePath(`${BASE_PATH}/guests`);
}

// ---------- ingredients ----------

export async function createIngredient(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const name = String(formData.get("name") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();
  if (!name || !unit) return;

  const yieldPercent = parseOptionalNumber(formData.get("yieldPercent"));
  const price = parseOptionalNumber(formData.get("price"));
  const supplierId = String(formData.get("supplierId") ?? "") || null;

  const db = supabaseAdmin();
  await db.from("kl_ingredients").insert({
    name,
    unit,
    supplier_id: supplierId,
    purchase_name: String(formData.get("purchaseName") ?? "").trim(),
    purchase_unit: String(formData.get("purchaseUnit") ?? "").trim(),
    yield_percent: yieldPercent,
    price,
  });
  revalidatePath(`${BASE_PATH}/ingredients`);
}

export async function updateIngredient(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const db = supabaseAdmin();
  await db
    .from("kl_ingredients")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      unit: String(formData.get("unit") ?? "").trim(),
      supplier_id: String(formData.get("supplierId") ?? "") || null,
      purchase_name: String(formData.get("purchaseName") ?? "").trim(),
      purchase_unit: String(formData.get("purchaseUnit") ?? "").trim(),
      yield_percent: parseOptionalNumber(formData.get("yieldPercent")),
      price: parseOptionalNumber(formData.get("price")),
    })
    .eq("id", id);
  revalidatePath(`${BASE_PATH}/ingredients`);
}

export async function deleteIngredient(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // kl_recipe_components.ingredient_id is ON DELETE CASCADE — any recipe
  // component using this ingredient is removed along with it.
  const db = supabaseAdmin();
  await db.from("kl_ingredients").delete().eq("id", id);
  revalidatePath(`${BASE_PATH}/ingredients`);
  revalidatePath(`${BASE_PATH}/recipes`);
}

function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  const str = String(value ?? "").trim();
  if (!str) return null;
  const num = Number(str);
  return Number.isFinite(num) ? num : null;
}
