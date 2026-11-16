"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { expireMeals } from "@/lib/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { DEPOSIT_PER_SEAT } from "@/lib/mealPayments";

type Db = ReturnType<typeof supabaseAdmin>;

function parseRestrictions(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** The optional detail fields shared by "add diner" and "edit diner" in the admin screen. */
function dinerDetails(formData: FormData) {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const [firstName, ...rest] = fullName.split(/\s+/);
  const age = Number(formData.get("age"));
  const gender = String(formData.get("gender") ?? "");
  return {
    full_name: fullName,
    first_name: firstName || null,
    last_name: rest.join(" ") || null,
    age: Number.isInteger(age) && age >= 1 && age <= 120 ? age : null,
    gender: gender === "male" || gender === "female" || gender === "other" ? gender : null,
    favorite_foods: String(formData.get("favorites") ?? "").trim().slice(0, 300),
  } as const;
}

async function syncRegistrationSeats(db: Db, registrationId: string): Promise<void> {
  const { data: diners } = await db.from("meal_diners").select("id").eq("registration_id", registrationId);
  const count = diners?.length ?? 0;
  // A coupon's discount stays a fixed amount off the deposit when seats are added or removed by hand.
  const { data: registration } = await db.from("meal_registrations").select("deposit_discount").eq("id", registrationId).maybeSingle();
  const discount = Number(registration?.deposit_discount ?? 0);
  await db
    .from("meal_registrations")
    .update({ seats_count: count, deposit_total: Math.max(0, DEPOSIT_PER_SEAT * count - discount) })
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
      deposit_total: DEPOSIT_PER_SEAT,
      paid_amount: paid ? DEPOSIT_PER_SEAT : 0,
      status: paid ? "paid" : "pending",
      source: "admin",
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
  expireMeals();
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
  expireMeals();
}

export async function deleteRegistration(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.from("meal_registrations").delete().eq("id", id);
  revalidatePath("/admin/meals");
  expireMeals();
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
  expireMeals();
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
    ...dinerDetails(formData),
    dietary_restrictions: restrictions,
    notes,
    deposit_paid: paid,
  });
  if (paid) {
    const { data: current } = await db.from("meal_registrations").select("paid_amount").eq("id", registrationId).maybeSingle();
    await db.from("meal_registrations").update({ paid_amount: Number(current?.paid_amount ?? 0) + DEPOSIT_PER_SEAT }).eq("id", registrationId);
  }

  // Once the owner adds someone by hand, the registration keeps its seats.
  await db.from("meal_registrations").update({ source: "admin" }).eq("id", registrationId);
  await syncRegistrationSeats(db, registrationId);
  revalidatePath("/admin/meals");
  expireMeals();
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
      ...dinerDetails(formData),
      dietary_restrictions: parseRestrictions(formData.get("restrictions")),
      notes: String(formData.get("notes") ?? "").trim(),
    })
    .eq("id", id);

  revalidatePath("/admin/meals");
  expireMeals();
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
  expireMeals();
}

/**
 * Saves what was paid and the two discounts of a booking. The deposit due follows the deposit discount; once the deposit
 * is covered the booking counts as paid (and its diners as paid), which is what the public seat count relies on.
 */
async function savePayment(db: Db, id: string, paid: number, depositDiscount: number, balanceDiscount: number): Promise<void> {
  const { data: diners } = await db.from("meal_diners").select("id").eq("registration_id", id);
  const seats = diners?.length ?? 0;
  const depositDue = Math.max(0, Math.round((DEPOSIT_PER_SEAT * seats - depositDiscount) * 100) / 100);
  const covered = seats > 0 && paid >= depositDue;

  const { data: current } = await db.from("meal_registrations").select("status").eq("id", id).maybeSingle();
  await db
    .from("meal_registrations")
    .update({
      paid_amount: paid,
      deposit_discount: depositDiscount,
      balance_discount: balanceDiscount,
      deposit_total: depositDue,
      // A cancelled booking stays cancelled; otherwise it is paid once the deposit is covered.
      status: current?.status === "cancelled" ? "cancelled" : covered ? "paid" : "pending",
    })
    .eq("id", id);
  await db.from("meal_diners").update({ deposit_paid: covered }).eq("registration_id", id);
}

function refreshPayments() {
  revalidatePath("/admin/meals");
  revalidatePath("/admin/open-payments");
  expireMeals();
}

const money = (value: FormDataEntryValue | null) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.round(n * 100) / 100, 100000) : 0;
};

/** Sets what was paid and the two discounts of a booking (the payment editor). */
export async function updateRegistrationPayment(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await savePayment(supabaseAdmin(), id, money(formData.get("paidAmount")), money(formData.get("depositDiscount")), money(formData.get("balanceDiscount")));
  refreshPayments();
}

/** A payment received: adds `amount` to what the booking has paid so far. */
export async function addRegistrationPayment(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();
  const id = String(formData.get("id") ?? "");
  const amount = money(formData.get("amount"));
  if (!id || amount <= 0) return;
  const { data: reg } = await db.from("meal_registrations").select("paid_amount, deposit_discount, balance_discount").eq("id", id).maybeSingle();
  if (!reg) return;
  await savePayment(db, id, Math.round((Number(reg.paid_amount) + amount) * 100) / 100, Number(reg.deposit_discount), Number(reg.balance_discount));
  refreshPayments();
}

/** The customer paid everything: the amount paid becomes the whole meal (after discounts). */
export async function markRegistrationPaidInFull(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { data: reg } = await db
    .from("meal_registrations")
    .select("paid_amount, deposit_discount, balance_discount, meals(price_per_seat)")
    .eq("id", id)
    .maybeSingle();
  if (!reg) return;
  const { data: diners } = await db.from("meal_diners").select("id").eq("registration_id", id);
  const price = Number((reg.meals as unknown as { price_per_seat: number } | null)?.price_per_seat ?? 0);
  const netTotal = Math.max(0, price * (diners?.length ?? 0) - Number(reg.deposit_discount) - Number(reg.balance_discount));
  await savePayment(db, id, Math.max(Number(reg.paid_amount), Math.round(netTotal * 100) / 100), Number(reg.deposit_discount), Number(reg.balance_discount));
  refreshPayments();
}

/**
 * Marks every registered booking of one meal (cancelled ones and unpaid website bookings excluded) as paid in full.
 * For a meal that already took place, when the day-of-meal balance was paid at the table and never recorded.
 */
export async function markMealPaidInFull(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();
  const mealId = String(formData.get("mealId") ?? "");
  if (!mealId) return;

  const { data: meal } = await db.from("meals").select("price_per_seat").eq("id", mealId).maybeSingle();
  if (!meal) return;
  const { data: regs } = await db
    .from("meal_registrations")
    .select("id, status, source, paid_amount, deposit_discount, balance_discount, meal_diners(id)")
    .eq("meal_id", mealId);
  for (const reg of regs ?? []) {
    if (reg.status === "cancelled" || (reg.status === "pending" && reg.source !== "admin")) continue;
    const seats = (reg.meal_diners as unknown as { id: string }[]).length;
    const netTotal = Math.max(0, Number(meal.price_per_seat) * seats - Number(reg.deposit_discount) - Number(reg.balance_discount));
    await savePayment(db, reg.id, Math.max(Number(reg.paid_amount), Math.round(netTotal * 100) / 100), Number(reg.deposit_discount), Number(reg.balance_discount));
  }
  refreshPayments();
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
    .select("id, registration_id, deposit_paid, meal_registrations(customer_name, customer_email, customer_phone, paid_amount)")
    .eq("id", dinerId)
    .maybeSingle();
  if (!diner) return;

  const oldRegistrationId = diner.registration_id as string;
  const oldReg = diner.meal_registrations as unknown as {
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    paid_amount: number;
  };
  // A diner whose deposit was paid takes that deposit along; the old booking gives up the same amount.
  const takenPaid = diner.deposit_paid ? DEPOSIT_PER_SEAT : 0;

  const { data: newRegistration, error } = await db
    .from("meal_registrations")
    .insert({
      meal_id: targetMealId,
      customer_name: oldReg.customer_name,
      customer_email: oldReg.customer_email,
      customer_phone: oldReg.customer_phone,
      seats_count: 1,
      deposit_total: DEPOSIT_PER_SEAT,
      paid_amount: takenPaid,
      status: takenPaid > 0 ? "paid" : "pending",
      source: "admin",
    })
    .select("id")
    .single();
  if (error || !newRegistration) return;

  await db.from("meal_diners").update({ registration_id: newRegistration.id }).eq("id", dinerId);
  if (takenPaid > 0) {
    await db.from("meal_registrations").update({ paid_amount: Math.max(0, Number(oldReg.paid_amount ?? 0) - takenPaid) }).eq("id", oldRegistrationId);
  }

  const { data: remaining } = await db.from("meal_diners").select("id").eq("registration_id", oldRegistrationId);
  if (!remaining || remaining.length === 0) {
    await db.from("meal_registrations").delete().eq("id", oldRegistrationId);
  } else {
    await syncRegistrationSeats(db, oldRegistrationId);
  }

  revalidatePath("/admin/meals");
  expireMeals();
}
