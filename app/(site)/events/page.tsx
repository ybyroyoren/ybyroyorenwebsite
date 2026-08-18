import type { Metadata } from "next";
import { getMediaByLocation } from "@/lib/media";
import { getLocale } from "@/lib/i18n";
import { getDict } from "@/lib/dictionary";
import { EventsForm } from "@/components/events/EventsForm";
import { Carousel } from "@/components/site/Carousel";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "אירועים פרטיים" };

export default async function EventsPage() {
  const [carouselImages, locale] = await Promise.all([
    getMediaByLocation("events_carousel"),
    getLocale(),
  ]);
  const t = getDict(locale).events;

  return (
    <div className={styles.layout}>
      <div className={styles.introCol}>
        <div className={styles.eyebrow}>{t.eyebrow}</div>
        <h1>{t.heading}</h1>
        <p>{t.sub}</p>

        {carouselImages.length > 0 && (
          <div className={styles.carouselWrap}>
            <Carousel images={carouselImages} narrow locale={locale} />
          </div>
        )}

        <div className={styles.leadTimeNote}>{t.leadTimeNote}</div>

        <div className={styles.eventTypes}>
          {t.eventTypes.map((row) => (
            <div key={row.label} className={styles.eventTypeRow}>
              <span>{row.label}</span>
              <span>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.formCol}>
        <h2>{t.formHeading}</h2>
        <p className={styles.formSub}>{t.formSub}</p>
        <EventsForm locale={locale} />
      </div>
    </div>
  );
}
