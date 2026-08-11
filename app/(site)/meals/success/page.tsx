import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { finalizeMealRegistration, getRegistrationById } from "@/lib/meals";
import { formatCurrency } from "@/lib/pricing";
import styles from "../../checkout/success/page.module.css";

export const metadata: Metadata = { title: "ההרשמה התקבלה" };

export default async function MealSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ registrationId?: string; simulated?: string }>;
}) {
  const { registrationId, simulated } = await searchParams;
  if (!registrationId) notFound();

  let registration = await getRegistrationById(registrationId);
  if (!registration) notFound();

  if (simulated === "1" && registration.status === "pending") {
    registration = await finalizeMealRegistration(registrationId, `simulated-meal:${registrationId}`);
  }

  return (
    <div className={styles.wrap}>
      <h1>{registration.status === "paid" ? "המקום שלך שוריין!" : "ההרשמה ממתינה לאישור תשלום"}</h1>
      <p>תודה, {registration.customerName}.</p>
      <p>
        {registration.mealTitle} — {registration.mealDate}
      </p>
      <p>מספר סועדים: {registration.seatsCount}</p>
      <p>מקדמה ששולמה: {formatCurrency(registration.depositTotal)}</p>
      <p>היתרה תשולם במקום בערב הארוחה. ביטול חינם עד 96 שעות לפני הארוחה.</p>
      <Link href="/meals" className={styles.back}>
        לחזרה לארוחות
      </Link>
    </div>
  );
}
