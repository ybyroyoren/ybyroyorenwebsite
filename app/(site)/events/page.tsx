import type { Metadata } from "next";
import { getMediaByLocation } from "@/lib/media";
import { EventsForm } from "@/components/events/EventsForm";
import { Carousel } from "@/components/site/Carousel";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "אירועים פרטיים" };

export default async function EventsPage() {
  const carouselImages = await getMediaByLocation("events_carousel");

  return (
    <div className={styles.layout}>
      <div className={styles.introCol}>
        <div className={styles.eyebrow}>אירועים פרטיים</div>
        <h1>אירוע שנבנה בדיוק סביבכם</h1>
        <p>
          ימי הולדת, אירועי חברה, ערבים משפחתיים — תפריט מותאם אישית, בבית שלכם או במקום שתבחרו.
          ממלאים פרטים, ואני חוזר/ת אליכם עם הצעה מותאמת.
        </p>

        {carouselImages.length > 0 && (
          <div className={styles.carouselWrap}>
            <Carousel images={carouselImages} narrow />
          </div>
        )}

        <div className={styles.leadTimeNote}>
          מומלץ להזמין מוקדם ככל האפשר על מנת לשריין את התאריך
        </div>

        <div className={styles.eventTypes}>
          <div className={styles.eventTypeRow}>
            <span>אצלנו, סביב שולחן</span>
            <span>עד 24 סועדים</span>
          </div>
          <div className={styles.eventTypeRow}>
            <span>אצלנו, עמידה</span>
            <span>עד 60 אורחים</span>
          </div>
          <div className={styles.eventTypeRow}>
            <span>אירוע חוץ, סביב שולחן</span>
            <span>עד 30 סועדים</span>
          </div>
          <div className={styles.eventTypeRow}>
            <span>אירוע חוץ, בופה מעמדות הגשה</span>
            <span>ללא הגבלה</span>
          </div>
        </div>
      </div>

      <div className={styles.formCol}>
        <h2>בואו נתכנן את האירוע שלכם</h2>
        <p className={styles.formSub}>כמה פרטים, ואחזור אליכם בהקדם עם הצעה</p>
        <EventsForm />
      </div>
    </div>
  );
}
