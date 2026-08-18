import Link from "next/link";
import { getLocale } from "@/lib/i18n";
import { getDict } from "@/lib/dictionary";
import styles from "./page.module.css";

export default async function HomePage() {
  const locale = await getLocale();
  const t = getDict(locale).home;

  return (
    <section className={styles.hero}>
      <div className={styles.heroMark}>Y</div>
      <div className={`wrap ${styles.inner}`}>
        <div className={styles.eyebrow}>{t.eyebrow}</div>
        <h1>{t.heading}</h1>
        <p className={styles.sub}>{t.sub}</p>
        <div className={styles.actions}>
          <Link className={`${styles.btn} ${styles.btnPrimary}`} href="/meals">
            {t.ctaMeals}
          </Link>
          <Link className={`${styles.btn} ${styles.btnOutline}`} href="/shop">
            {t.ctaShop}
          </Link>
        </div>
        <Link className={styles.tertiary} href="/events">
          {t.ctaEvents}
        </Link>
      </div>
      <div className={styles.scrollCue}>{t.scrollCue}</div>
    </section>
  );
}
