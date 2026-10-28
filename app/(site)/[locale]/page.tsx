import Link from "next/link";
import { resolveLocale, localePath } from "@/lib/i18n";
import { getDict } from "@/lib/dictionary";
import { getMediaByLocation } from "@/lib/media";
import { Carousel } from "@/components/site/Carousel";
import { stagger } from "@/lib/motion";
import styles from "./page.module.css";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const t = getDict(locale).home;
  const images = await getMediaByLocation("home_carousel");

  return (
    <section className={`${styles.hero} ${images.length > 0 ? styles.heroWithMedia : ""}`}>
      <div className={styles.heroMark}>Y</div>
      <div className={`wrap ${styles.inner} ${images.length > 0 ? styles.withMedia : ""}`}>
        <div className={styles.textCol}>
          <div className={`${styles.eyebrow} enter`} style={stagger(0)}>{t.eyebrow}</div>
          <h1 className="enter" style={stagger(1)}>{t.heading}</h1>
          <p className={`${styles.sub} enter`} style={stagger(2)}>{t.sub}</p>
          <div className={`${styles.actions} enter`} style={stagger(3)}>
            <Link className={`${styles.btn} ${styles.btnPrimary}`} href={localePath(locale, "/meals")}>
              {t.ctaMeals}
            </Link>
            <Link className={`${styles.btn} ${styles.btnOutline}`} href={localePath(locale, "/shop")}>
              {t.ctaShop}
            </Link>
          </div>
          <Link className={`${styles.tertiary} enter`} style={stagger(4)} href={localePath(locale, "/events")}>
            {t.ctaEvents}
          </Link>
        </div>
        {images.length > 0 && (
          <div className={`${styles.media} enterScale`} style={stagger(2)}>
            <Carousel images={images} single locale={locale} />
          </div>
        )}
      </div>
      <div className={styles.scrollCue}>{t.scrollCue}</div>
    </section>
  );
}
