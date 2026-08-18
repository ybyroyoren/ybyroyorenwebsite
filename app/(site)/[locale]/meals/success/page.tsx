import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { finalizeMealRegistration, getRegistrationById } from "@/lib/meals";
import { formatCurrency } from "@/lib/pricing";
import { resolveLocale, localePath } from "@/lib/i18n";
import { getDict } from "@/lib/dictionary";
import styles from "../../checkout/success/page.module.css";

export const metadata: Metadata = { title: "ההרשמה התקבלה" };

export default async function MealSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ registrationId?: string; simulated?: string }>;
}) {
  const { registrationId, simulated } = await searchParams;
  if (!registrationId) notFound();

  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const t = getDict(locale).meals.success;

  let registration = await getRegistrationById(registrationId);
  if (!registration) notFound();

  if (simulated === "1" && registration.status === "pending") {
    registration = await finalizeMealRegistration(registrationId, `simulated-meal:${registrationId}`);
  }

  return (
    <div className={styles.wrap}>
      <h1>{registration.status === "paid" ? t.paidHeading : t.pendingHeading}</h1>
      <p>{t.thanks(registration.customerName)}</p>
      <p>{t.mealLine(registration.mealTitle, registration.mealDate)}</p>
      <p>{t.seatsCount(registration.seatsCount)}</p>
      <p>{t.depositPaid(formatCurrency(registration.depositTotal))}</p>
      <p>{t.balanceNote}</p>
      <Link href={localePath(locale, "/meals")} className={styles.back}>
        {t.backToMeals}
      </Link>
    </div>
  );
}
