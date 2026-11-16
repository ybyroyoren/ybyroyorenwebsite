import "server-only";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/cache";
import type { MealMenuItem, SeatsMeterMode, SeatsTextMode } from "@/lib/supabase/types";
import { issueReceipt } from "@/lib/green-invoice";
import { sendMealRegistrationConfirmationEmail } from "@/lib/resend";
import { notifyNewMealRegistration } from "@/lib/notifications";
import { couponValueOf, recordCouponUse, validateCoupon } from "@/lib/coupons";
import { discountOf } from "@/lib/couponMath";
import { formatCurrency } from "@/lib/pricing";
import { todayIsraelIso } from "@/lib/date";
import { GENDERS, NO_RESTRICTIONS, OCCASIONS, OTHER_RESTRICTION, RESTRICTIONS, hebrewLabels, type Gender } from "@/lib/mealForm";

import { DEPOSIT_PER_SEAT } from "@/lib/mealPayments";
export { DEPOSIT_PER_SEAT };
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
  /** How the seats are shown to visitors (see lib/seats.ts seatsDisplay). */
  seatsTextMode: SeatsTextMode;
  /** The owner closed registration by hand (shown as full) although seats are left. */
  registrationClosed: boolean;
  seatsTextHe: string;
  seatsTextEn: string;
  seatsMeterMode: SeatsMeterMode;
}

// Always hits the database. Use this wherever the answer gates a write
// (registration checks remaining seats against it) — the cached
// getOpenMeals below is only for display, and may lag a few seconds.
async function fetchOpenMeals(): Promise<MealView[]> {
  const db = supabaseAdmin();
  const { data: meals, error } = await db
    .from("meals")
    .select("id, title, description, date, total_seats, price_per_seat, menu, seats_text_mode, seats_text_he, seats_text_en, seats_meter_mode, registration_closed")
    .eq("status", "open")
    // A meal whose date has passed is no longer shown or bookable (same rule as the admin "עברה" list).
    .gte("date", todayIsraelIso())
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
      seatsTextMode: m.seats_text_mode ?? "auto",
      registrationClosed: m.registration_closed ?? false,
      seatsTextHe: m.seats_text_he ?? "",
      seatsTextEn: m.seats_text_en ?? "",
      seatsMeterMode: m.seats_meter_mode ?? "auto",
    };
  });
}

// Display-only: seat counts here can lag registrations by up to a minute
// (or until a payment/admin edit expires the "meals" tag). Never use this
// to decide whether a registration fits — see fetchOpenMeals.
export const getOpenMeals = unstable_cache(fetchOpenMeals, ["open-meals"], {
  tags: [CACHE_TAGS.meals],
  revalidate: 60,
});

export async function getMealById(mealId: string): Promise<MealView | null> {
  const meals = await fetchOpenMeals();
  return meals.find((m) => m.id === mealId) ?? null;
}

export interface DinerInput {
  firstName: string;
  lastName: string;
  age: number | null;
  gender: Gender | "";
  /** Keys from RESTRICTIONS (lib/mealForm.ts). */
  restrictions: string[];
  /** Free text; required when the restriction "other" is chosen. */
  notes: string;
  /** What the diner loves to eat (optional; not a promise that it is on the menu). */
  favorites?: string;
}

export interface RegistrationExtras {
  /** Keys from OCCASIONS. */
  occasions: string[];
  occasionOther: string;
  extraNotes: string;
  /** Who they would like to sit next to (one line for the whole booking). */
  seatingNote: string;
  /** The visitor ticked the allergy-warning / cancellation-policy confirmation. */
  consent: boolean;
}

/** The first problem with the diners' details (Hebrew message), or null when they are complete. */
export function dinerProblem(diners: DinerInput[]): string | null {
  for (let i = 0; i < diners.length; i++) {
    const d = diners[i];
    const who = `סועד/ת ${i + 1}: `;
    if (!d.firstName?.trim()) return `${who}נא למלא שם פרטי`;
    if (!d.lastName?.trim()) return `${who}נא למלא שם משפחה`;
    if (!Number.isInteger(d.age) || (d.age as number) < 1 || (d.age as number) > 120) return `${who}נא למלא גיל תקין`;
    if (!GENDERS.some((g) => g.key === d.gender)) return `${who}נא לבחור מין`;
    const known = Array.isArray(d.restrictions) ? d.restrictions.filter((k) => RESTRICTIONS.some((r) => r.key === k)) : [];
    if (known.length === 0) return `${who}נא לסמן הגבלה אחת לפחות, או ״ללא הגבלות״`;
    if (known.includes(NO_RESTRICTIONS) && known.length > 1) return `${who}״ללא הגבלות״ אי אפשר לשלב עם הגבלה אחרת`;
    if (known.includes(OTHER_RESTRICTION) && !d.notes?.trim()) return `${who}נא לפרט את ההגבלה האחרת בשורת הטקסט`;
  }
  return null;
}

export interface CreateRegistrationParams {
  mealId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  diners: DinerInput[];
  extras?: RegistrationExtras;
  /** Optional coupon code for the deposit. */
  couponCode?: string;
}

export async function createPendingRegistration(
  params: CreateRegistrationParams
): Promise<{ registrationId: string; depositTotal: number; discount: number; balanceDiscount: number }> {
  const meal = await getMealById(params.mealId);
  if (!meal) throw new Error("הארוחה לא נמצאה");
  if (meal.registrationClosed || meal.seatsTextMode === "full") throw new Error("ההרשמה לארוחה הזו סגורה");

  const seats = params.diners.length;
  if (seats < 1) throw new Error("יש לבחור לפחות סועד אחד");
  if (seats > meal.remainingSeats) throw new Error("אין מספיק מקומות פנויים");
  const problem = dinerProblem(params.diners);
  if (problem) throw new Error(problem);
  if (params.extras?.consent !== true) throw new Error("נא לאשר שקראתם את אזהרת האלרגנים ואת מדיניות הביטול");

  // A coupon (a percentage or a fixed amount) comes off the deposit, or off the balance beyond the deposit (paid at the
  // table). It is checked again here: the page's check is only a preview.
  const fullDeposit = DEPOSIT_PER_SEAT * seats;
  const balancePart = Math.max(0, (meal.pricePerSeat - DEPOSIT_PER_SEAT) * seats);
  let couponId: string | null = null;
  let depositDiscount = 0;
  let balanceDiscount = 0;
  if (params.couponCode?.trim()) {
    const coupon = await validateCoupon(params.couponCode, "meals");
    if (!coupon.valid) throw new Error(coupon.message || "קוד קופון לא תקין");
    couponId = coupon.couponId ?? null;
    if (coupon.mealTarget === "balance") balanceDiscount = discountOf(balancePart, couponValueOf(coupon));
    else depositDiscount = discountOf(fullDeposit, couponValueOf(coupon));
  }
  const discount = depositDiscount;
  const depositTotal = Math.max(0, Math.round((fullDeposit - depositDiscount) * 100) / 100);

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
      coupon_id: couponId,
      deposit_discount: depositDiscount,
      balance_discount: balanceDiscount,
      occasions: hebrewLabels(OCCASIONS, params.extras?.occasions ?? []),
      occasion_other: (params.extras?.occasionOther ?? "").trim().slice(0, 200),
      extra_notes: (params.extras?.extraNotes ?? "").trim().slice(0, 1000),
      seating_note: (params.extras?.seatingNote ?? "").trim().slice(0, 300),
      consented_at: new Date().toISOString(),
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !registration) throw new Error(error?.message ?? "Failed to create registration");

  const dinerRows = params.diners.map((d) => ({
    registration_id: registration.id,
    full_name: `${d.firstName.trim()} ${d.lastName.trim()}`.slice(0, 120),
    first_name: d.firstName.trim().slice(0, 60),
    last_name: d.lastName.trim().slice(0, 60),
    age: d.age,
    gender: d.gender as Gender,
    dietary_restrictions: hebrewLabels(RESTRICTIONS, d.restrictions),
    notes: (d.notes ?? "").trim().slice(0, 300),
    favorite_foods: (d.favorites ?? "").trim().slice(0, 300),
  }));
  const { error: dinersError } = await db.from("meal_diners").insert(dinerRows);
  if (dinersError) throw new Error(dinersError.message);

  return { registrationId: registration.id, depositTotal, discount, balanceDiscount };
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
  growPaymentId: string | null
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
  // What is left to pay at the table: the meal minus the full deposit (the coupon's discount is a real discount).
  const balance = Math.max(0, total - (registration.deposit_total + registration.deposit_discount) - registration.balance_discount);

  let receiptDocId: string | null = null;
  // A registration whose deposit was fully covered by a coupon has nothing to receipt.
  if (registration.deposit_total > 0) {
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
  }

  await db
    .from("meal_registrations")
    .update({ status: "paid", grow_payment_id: growPaymentId, receipt_doc_id: receiptDocId, paid_amount: registration.deposit_total })
    .eq("id", registrationId);

  await db.from("meal_diners").update({ deposit_paid: true }).eq("registration_id", registrationId);
  if (registration.coupon_id) await recordCouponUse(registration.coupon_id);

  await sendMealRegistrationConfirmationEmail({
    to: registration.customer_email,
    customerName: registration.customer_name,
    mealTitle: meal.title,
    mealDate: meal.date,
    seats: registration.seats_count,
    depositFormatted: formatCurrency(registration.deposit_total),
    balanceFormatted: formatCurrency(balance),
  });

  await notifyNewMealRegistration({
    customerName: registration.customer_name,
    customerPhone: registration.customer_phone,
    customerEmail: registration.customer_email,
    mealTitle: meal.title,
    mealDate: meal.date,
    seats: registration.seats_count,
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

export interface FreeRegistrationView {
  id: string;
  status: "pending" | "paid" | "cancelled";
  seatsCount: number;
  fullDeposit: number;
  discount: number;
  /** Discount off the balance paid at the table (a coupon on the balance, not the deposit). */
  balanceDiscount: number;
  couponCode: string | null;
  mealTitle: string;
  mealDate: string;
  pricePerSeat: number;
  /** Why it can't be confirmed right now, if so: "full" (seats gone), "closed" (registration closed), "expired". */
  problem: "full" | "closed" | "expired" | "not-free" | null;
}

const HOLD_MINUTES = 30; // how long a not-yet-paid booking holds its seats (see the meal_availability view)

/** A zero-deposit registration waiting for the visitor's confirmation, with a check that it can still be confirmed. */
export async function getFreeRegistrationToConfirm(id: string): Promise<FreeRegistrationView | null> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("meal_registrations")
    .select("id, meal_id, status, seats_count, deposit_total, deposit_discount, balance_discount, created_at, coupons(code), meals(title, date, price_per_seat)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  const meal = data.meals as unknown as { title: string; date: string; price_per_seat: number };
  const view: FreeRegistrationView = {
    id: data.id,
    status: data.status,
    seatsCount: data.seats_count,
    fullDeposit: Number(data.deposit_total) + Number(data.deposit_discount),
    discount: Number(data.deposit_discount),
    balanceDiscount: Number(data.balance_discount),
    couponCode: (data.coupons as unknown as { code: string } | null)?.code ?? null,
    mealTitle: meal.title,
    mealDate: meal.date,
    pricePerSeat: Number(meal.price_per_seat),
    problem: null,
  };
  if (data.status !== "pending" || Number(data.deposit_total) > 0) {
    view.problem = "not-free";
    return view;
  }

  // The seats were held for HOLD_MINUTES from the start. After that they may have been taken, so check again.
  const open = await getMealById(data.meal_id);
  if (!open) view.problem = "expired";
  else if (open.registrationClosed || open.seatsTextMode === "full") view.problem = "closed";
  else if (Date.now() - new Date(data.created_at).getTime() > HOLD_MINUTES * 60_000 && data.seats_count > open.remainingSeats) {
    view.problem = "full";
  }
  return view;
}
