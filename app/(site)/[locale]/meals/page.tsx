import type { Metadata } from "next";
import { getOpenMeals } from "@/lib/meals";
import { getMediaByLocation } from "@/lib/media";
import { resolveLocale } from "@/lib/i18n";
import { getDict } from "@/lib/dictionary";
import { MealsList } from "@/components/meals/MealsList";
import { Carousel } from "@/components/site/Carousel";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "ארוחות פתוחות" };

export default async function MealsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const [meals, carouselImages] = await Promise.all([
    getOpenMeals(),
    getMediaByLocation("meals_carousel"),
  ]);
  const t = getDict(locale).meals;

  return (
    <>
      <div className={`wrap ${styles.pageHead}`}>
        <div className={styles.eyebrow}>{t.eyebrow}</div>
        <h1>{t.heading}</h1>
        <p>
          {t.subLine1}
          <br />
          {t.subLine2}
        </p>
        <div className={styles.venueNote}>{t.venueNote}</div>
      </div>

      {carouselImages.length > 0 && (
        <div className={`wrap ${styles.carouselWrap}`}>
          <Carousel images={carouselImages} locale={locale} />
        </div>
      )}

      <div className={`wrap ${styles.section}`}>
        {meals.length === 0 ? (
          <div className={styles.empty}>{t.empty}</div>
        ) : (
          <MealsList meals={meals} locale={locale} />
        )}
      </div>
    </>
  );
}
