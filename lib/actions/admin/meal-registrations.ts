"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { DEPOSIT_PER_SEAT } from "@/lib/meals";

type Db = ReturnType<typeof supabaseAdmin>;

function parseRestrictions(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function syncRegistrationSeats(db: Db, registrationId: string): Promise<void> {
  const { data: diners } = await db.from("meal_diners").select("id").eq("registration_id", registrationId);
  const count = diners?.length ?? 0;
  await db
    .from("meal_registrations")
    .update({ seats_count: count, deposit_total: DEPOSIT_PER_SEAT * count })
    .eq("id", registrationId);
}

export async function createManualRegistration(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();

  const mealId = String(formData.get("mealId") ?? "");
  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerEmail = String(formData.get("customerEmail") ?? "").trim();
  const customerPhone = String(formData.get("customerPhone") ?? "").trim();
  const dinerName = String(formData.get("dinerName") ?? "").trim();
  const restrictions = parseRestrictions(formData.get("restrictions"));
  const notes = String(formData.get("notes") ?? "").trim();
  const paid = formData.get("paid") === "on";

  if (!mealId || !customerName || !dinerName) return;

  const { data: registration, error } = await db
    .from("meal_registrations")
    .insert({
      meal_id: mealId,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      seats_count: 1,
      deposit_total: paid ? DEPOSIT_PER_SEAT : 0,
      status: paid ? "paid" : "pending",
    })
    .select("id")
    .single();

  if (error || !registration) return;

  await db.from("meal_diners").insert({
    registration_id: registration.id,
    full_name: dinerName,
    dietary_restrictions: restrictions,
    notes,
    deposit_paid: paid,
  });

  revalidatePath("/admin/meals");
}

export async function updateRegistrationContact(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db
    .from("meal_registrations")
    .update({
      customer_name: String(formData.get("customerName") ?? "").trim(),
      customer_email: String(formData.get("customerEmail") ?? "").trim(),
      customer_phone: String(formData.get("customerPhone") ?? "").trim(),
    })
    .eq("id", id);

  revalidatePath("/admin/meals");
}

export async function deleteRegistration(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.from("meal_registrations").delete().eq("id", id);
  revalidatePath("/admin/meals");
}

export async function moveRegistrationToMeal(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();
  const id = String(formData.get("id") ?? "");
  const targetMealId = String(formData.get("targetMealId") ?? "");
  if (!id || !targetMealId) return;

  await db.from("meal_registrations").update({ meal_id: targetMealId }).eq("id", id);
  revalidatePath("/admin/meals");
}

export async function addDinerToRegistration(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();

  const registrationId = String(formData.get("registrationId") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const restrictions = parseRestrictions(formData.get("restrictions"));
  const notes = String(formData.get("notes") ?? "").trim();
  const paid = formData.get("paid") === "on";
  if (!registrationId || !fullName) return;

  await db.from("meal_diners").insert({
    registration_id: registrationId,
    full_name: fullName,
    dietary_restrictions: restrictions,
    notes,
    deposit_paid: paid,
  });

  await syncRegistrationSeats(db, registrationId);
  revalidatePath("/admin/meals");
}

export async function updateDiner(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db
    .from("meal_diners")
    .update({
      full_name: String(formData.get("fullName") ?? "").trim(),
      dietary_restrictions: parseRestrictions(formData.get("restrictions")),
      notes: String(formData.get("notes") ?? "").trim(),
      deposit_paid: formData.get("paid") === "on",
    })
    .eq("id", id);

  revalidatePath("/admin/meals");
}

export async function deleteDiner(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();
  const id = String(formData.get("id") ?? "");
  const registrationId = String(formData.get("registrationId") ?? "");
  if (!id || !registrationId) return;

  await db.from("meal_diners").delete().eq("id", id);

  const { data: remaining } = await db.from("meal_diners").select("id").eq("registration_id", registrationId);
  if (!remaining || remaining.length === 0) {
    await db.from("meal_registrations").delete().eq("id", registrationId);
  } else {
    await syncRegistrationSeats(db, registrationId);
  }

  revalidatePath("/admin/meals");
}

export async function toggleDinerPaid(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();
  const id = String(formData.get("id") ?? "");
  const current = formData.get("current") === "true";
  if (!id) return;

  await db.from("meal_diners").update({ deposit_paid: !current }).eq("id", id);
  revalidatePath("/admin/meals");
}

export async function moveDinerToMeal(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();

  const dinerId = String(formData.get("dinerId") ?? "");
  const targetMealId = String(formData.get("targetMealId") ?? "");
  if (!dinerId || !targetMealId) return;

  const { data: diner } = await db
    .from("meal_diners")
    .select("id, registration_id, deposit_paid, meal_registrations(customer_name, customer_email, customer_phone)")
    .eq("id", dinerId)
    .maybeSingle();
  if (!diner) return;

  const oldRegistrationId = diner.registration_id as string;
  const oldReg = diner.meal_registrations as unknown as {
    customer_name: string;
    customer_email: string;
    customer_phone: string;
  };

  const { data: newRegistration, error } = await db
    .from("meal_registrations")
    .insert({
      meal_id: targetMealId,
      customer_name: oldReg.customer_name,
      customer_email: oldReg.customer_email,
      customer_phone: oldReg.customer_phone,
      seats_count: 1,
      deposit_total: diner.deposit_paid ? DEPOSIT_PER_SEAT : 0,
      status: diner.deposit_paid ? "paid" : "pending",
    })
    .select("id")
    .single();
  if (error || !newRegistration) return;

  await db.from("meal_diners").update({ registration_id: newRegistration.id }).eq("id", dinerId);

  const { data: remaining } = await db.from("meal_diners").select("id").eq("registration_id", oldRegistrationId);
  if (!remaining || remaining.length === 0) {
    await db.from("meal_registrations").delete().eq("id", oldRegistrationId);
  } else {
    await syncRegistrationSeats(db, oldRegistrationId);
  }

  revalidatePath("/admin/meals");
}
