import type { Metadata } from "next";
import { getOpenMeals } from "@/lib/meals";
import { getMediaByLocation } from "@/lib/media";
import { MealsList } from "@/components/meals/MealsList";
import { Carousel } from "@/components/site/Carousel";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "ארוחות פתוחות" };

export default async function MealsPage() {
  const [meals, carouselImages] = await Promise.all([
    getOpenMeals(),
    getMediaByLocation("meals_carousel"),
  ]);

  return (
    <>
      <div className={`wrap ${styles.pageHead}`}>
        <div className={styles.eyebrow}>ארוחות פתוחות</div>
        <h1>מקום אחד, ליד השולחן</h1>
        <p>
          כמה תאריכים בחודש, סביב שולחן אחד ומספר מקומות מוגבל. ההרשמה כוללת תשלום מקדמה
          מאובטח; היתרה משולמת במקום.
        </p>
        <div className={styles.venueNote}>
          📍 הארוחות מתקיימות בחלל האירוח שלנו, רחוב השוק 34, תל אביב
        </div>
      </div>

      {carouselImages.length > 0 && (
        <div className={`wrap ${styles.carouselWrap}`}>
          <Carousel images={carouselImages} />
        </div>
      )}

      <div className={`wrap ${styles.section}`}>
        {meals.length === 0 ? (
          <div className={styles.empty}>אין ארוחות פתוחות פנויות כרגע.</div>
        ) : (
          <MealsList meals={meals} />
        )}
      </div>
    </>
  );
}
