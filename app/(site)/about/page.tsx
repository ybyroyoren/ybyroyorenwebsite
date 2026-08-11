import type { Metadata } from "next";
import { getMediaByLocation } from "@/lib/media";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "אודות" };

export default async function AboutPage() {
  const [heroImage] = await getMediaByLocation("about_hero");

  return (
    <div className={`wrap ${styles.hero}`}>
      <div>
        <div className={styles.eyebrow}>אודות</div>
        <h1>
          רוי אורן,
          <br />
          שף פרטי
        </h1>
        <p>
          עזבתי קריירת הייטק כדי ללמוד בישול ואפייה מקצועיים בבתי הספר של אלן דוקאס בפריז
          ובאיסאנז&apos;ו שבצרפת, ולעבור סטאז&apos; תחת השף Massimo Bottura ב-Osteria Francescana
          באיטליה. אני מאמין שדיוק הטעם קודם לכול - מנות דגל שמתפתחות ומשתפרות עם הזמן, לצד
          המצאות חדשות שפיתחתי וניסיתי במטבח שלי. למה אנחנו נקראים Y? תגיעו לאחד האירועים שלנו
          ותשמעו את הסיפור ממני.
        </p>
      </div>
      <div className={`${styles.visual} ${heroImage ? styles.hasPhoto : ""}`}>
        {heroImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.photo} src={heroImage.url} alt="רוי אורן" />
        )}
      </div>
    </div>
  );
}
