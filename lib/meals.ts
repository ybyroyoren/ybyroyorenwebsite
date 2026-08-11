import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { MealMenuItem } from "@/lib/supabase/types";
import { issueReceipt } from "@/lib/green-invoice";
import { sendMealRegistrationConfirmationEmail } from "@/lib/resend";
import { formatCurrency } from "@/lib/pricing";

export const DEPOSIT_PER_SEAT = 100;
export const MEAL_CANCEL_HOURS = 96;

export interface MealView {
  id: string;
  title: string;
  description: string;
  date: string;
  totalSeats: number;
  takenSeats: number;
  remainingSeats: number;
  pricePerSeat: number;
  menu: MealMenuItem[];
}

export async function getOpenMeals(): Promise<MealView[]> {
  const db = supabaseAdmin();
  const { data: meals, error } = await db
    .from("meals")
    .select("id, title, description, date, total_seats, price_per_seat, menu")
    .eq("status", "open")
    .order("date", { ascending: true });

  if (error) throw new Error(error.message);
  if (!meals || meals.length === 0) return [];

  const { data: availability } = await db
    .from("meal_availability")
    .select("meal_id, total_seats, taken_seats, remaining_seats");

  const availByMealId = new Map((availability ?? []).map((a) => [a.meal_id, a]));

  return meals.map((m) => {
    const avail = availByMealId.get(m.id);
    return {
      id: m.id,
      title: m.title,
      description: m.description,
      date: m.date,
      totalSeats: m.total_seats,
      takenSeats: avail?.taken_seats ?? 0,
      remainingSeats: avail?.remaining_seats ?? m.total_seats,
      pricePerSeat: m.price_per_seat,
      menu: (m.menu ?? []) as MealMenuItem[],
    };
  });
}

export async function getMealById(mealId: string): Promise<MealView | null> {
  const meals = await getOpenMeals();
  return meals.find((m) => m.id === mealId) ?? null;
}

export interface DinerInput {
  fullName: string;
  dietaryRestrictions: string[];
  notes: string;
}

export interface CreateRegistrationParams {
  mealId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  diners: DinerInput[];
}

export async function createPendingRegistration(
  params: CreateRegistrationParams
): Promise<{ registrationId: string; depositTotal: number }> {
  const meal = await getMealById(params.mealId);
  if (!meal) throw new Error("הארוחה לא נמצאה");

  const seats = params.diners.length;
  if (seats < 1) throw new Error("יש לבחור לפחות סועד אחד");
  if (seats > meal.remainingSeats) throw new Error("אין מספיק מקומות פנויים");
  if (params.diners.some((d) => !d.fullName.trim())) {
    throw new Error("שם מלא נדרש לכל סועד");
  }

  const depositTotal = DEPOSIT_PER_SEAT * seats;
  const db = supabaseAdmin();

  const { data: registration, error } = await db
    .from("meal_registrations")
    .insert({
      meal_id: params.mealId,
      customer_name: params.customerName,
      customer_email: params.customerEmail,
      customer_phone: params.customerPhone,
      seats_count: seats,
      deposit_total: depositTotal,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !registration) throw new Error(error?.message ?? "Failed to create registration");

  const dinerRows = params.diners.map((d) => ({
    registration_id: registration.id,
    full_name: d.fullName,
    dietary_restrictions: d.dietaryRestrictions,
    notes: d.notes,
  }));
  const { error: dinersError } = await db.from("meal_diners").insert(dinerRows);
  if (dinersError) throw new Error(dinersError.message);

  return { registrationId: registration.id, depositTotal };
}

export interface RegistrationSummary {
  id: string;
  customerName: string;
  seatsCount: number;
  depositTotal: number;
  status: "pending" | "paid" | "cancelled";
  mealTitle: string;
  mealDate: string;
}

export async function getRegistrationById(id: string): Promise<RegistrationSummary | null> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("meal_registrations")
    .select("id, customer_name, seats_count, deposit_total, status, meals(title, date)")
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;
  const meal = data.meals as unknown as { title: string; date: string };
  return {
    id: data.id,
    customerName: data.customer_name,
    seatsCount: data.seats_count,
    depositTotal: data.deposit_total,
    status: data.status,
    mealTitle: meal.title,
    mealDate: meal.date,
  };
}

/**
 * Returns the updated registration directly rather than making the caller
 * re-query it — Next.js dedupes identical fetches within a single request,
 * so a fresh `getRegistrationById` call right after this would silently
 * return the pre-update (still "pending") snapshot.
 */
export async function finalizeMealRegistration(
  registrationId: string,
  growPaymentId: string
): Promise<RegistrationSummary> {
  const db = supabaseAdmin();

  const { data: registration } = await db
    .from("meal_registrations")
    .select("*, meals(title, date, price_per_seat)")
    .eq("id", registrationId)
    .maybeSingle();

  if (!registration) throw new Error("Registration not found");

  const meal = registration.meals as unknown as { title: string; date: string; price_per_seat: number };

  if (registration.status === "paid") {
    return {
      id: registration.id,
      customerName: registration.customer_name,
      seatsCount: registration.seats_count,
      depositTotal: registration.deposit_total,
      status: registration.status,
      mealTitle: meal.title,
      mealDate: meal.date,
    };
  }

  const total = meal.price_per_seat * registration.seats_count;
  const balance = total - registration.deposit_total;

  let receiptDocId: string | null = null;
  try {
    const receipt = await issueReceipt({
      customerName: registration.customer_name,
      customerEmail: registration.customer_email,
      items: [
        {
          description: `מקדמה — ${meal.title} (${registration.seats_count} סועדים)`,
          quantity: 1,
          unitPrice: registration.deposit_total,
        },
      ],
      total: registration.deposit_total,
    });
    receiptDocId = receipt.documentId;
  } catch (err) {
    console.error(`[green-invoice] Failed to issue receipt for registration ${registrationId}:`, err);
  }

  await db
    .from("meal_registrations")
    .update({ status: "paid", grow_payment_id: growPaymentId, receipt_doc_id: receiptDocId })
    .eq("id", registrationId);

  await db.from("meal_diners").update({ deposit_paid: true }).eq("registration_id", registrationId);

  await sendMealRegistrationConfirmationEmail({
    to: registration.customer_email,
    customerName: registration.customer_name,
    mealTitle: meal.title,
    mealDate: meal.date,
    seats: registration.seats_count,
    depositFormatted: formatCurrency(registration.deposit_total),
    balanceFormatted: formatCurrency(balance),
  });

  return {
    id: registration.id,
    customerName: registration.customer_name,
    seatsCount: registration.seats_count,
    depositTotal: registration.deposit_total,
    status: "paid",
    mealTitle: meal.title,
    mealDate: meal.date,
  };
}
