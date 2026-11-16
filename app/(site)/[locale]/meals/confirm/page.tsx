import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getFreeRegistrationToConfirm } from "@/lib/meals";
import { confirmFreeRegistration } from "@/lib/actions/meals-confirm";
import { formatCurrency } from "@/lib/pricing";
import { resolveLocale, localePath } from "@/lib/i18n";
import { getDict } from "@/lib/dictionary";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "סיכום הרשמה" };

/** Summary step for a registration whose deposit a coupon covered completely (nothing to pay): amount, discount, confirm. */
export default async function MealConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ registrationId?: string; error?: string }>;
}) {
  const { registrationId, error } = await searchParams;
  if (!registrationId) notFound();
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const t = getDict(locale).meals.confirm;

  const reg = await getFreeRegistrationToConfirm(registrationId);
  if (!reg) notFound();
  if (reg.status === "paid") redirect(`${localePath(locale, "/meals/success")}?registrationId=${registrationId}`);
  if (reg.problem === "not-free") redirect(localePath(locale, "/meals"));

  const problem = (reg.problem ?? (error === "full" || error === "closed" || error === "expired" ? error : null)) as
    | "full"
    | "closed"
    | "expired"
    | null;
  const balance = reg.pricePerSeat * reg.seatsCount - reg.fullDeposit;

  return (
    <div className={styles.wrap}>
      <h1>{t.heading}</h1>
      <p className={styles.intro}>{t.intro}</p>

      <div className={styles.card}>
        <div className={styles.meal}>{t.mealLine(reg.mealTitle, reg.mealDate)}</div>
        <div className={styles.row}>
          <span>{t.seats}</span>
          <span>{reg.seatsCount}</span>
        </div>
        <div className={styles.row}>
          <span>{t.deposit}</span>
          <span>{formatCurrency(reg.fullDeposit)}</span>
        </div>
        <div className={styles.row}>
          <span>{t.discount(reg.couponCode)}</span>
          <span>-{formatCurrency(reg.discount)}</span>
        </div>
        <div className={`${styles.row} ${styles.grand}`}>
          <span>{t.toPay}</span>
          <span>{t.free}</span>
        </div>
        <p className={styles.note}>{t.balanceNote(formatCurrency(balance))}</p>
      </div>

      {problem ? (
        <p className={styles.error} role="alert">
          {t.errors[problem]}
        </p>
      ) : (
        <form action={confirmFreeRegistration}>
          <input type="hidden" name="registrationId" value={registrationId} />
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className={`ybtn ${styles.confirmBtn}`}>
            {t.confirmBtn}
          </button>
        </form>
      )}

      <Link href={localePath(locale, "/meals")} className={styles.back}>
        {t.backToMeals}
      </Link>
    </div>
  );
}
