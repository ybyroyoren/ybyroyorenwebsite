import type { Metadata } from "next";
import { getMediaByLocation } from "@/lib/media";
import { resolveLocale } from "@/lib/i18n";
import { getDict } from "@/lib/dictionary";
import { EventInquiry } from "@/components/events/EventInquiry";
import { Carousel } from "@/components/site/Carousel";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "אירועים פרטיים" };

export default async function EventsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const carouselImages = await getMediaByLocation("events_carousel");
  const t = getDict(locale).events;

  return (
    <>
      <div className={`wrap ${styles.content}`}>
        <div className={`${styles.eyebrow} enter`}>{t.eyebrow}</div>
        <h1 className="enter" style={{ "--i": 1 } as React.CSSProperties}>
          {t.heading}
        </h1>
        <p className={`${styles.intro} enter`} style={{ "--i": 2 } as React.CSSProperties}>
          {t.sub}
        </p>

        <div className={`${styles.cta} enter`} style={{ "--i": 3 } as React.CSSProperties}>
          <EventInquiry locale={locale} />
        </div>

        {carouselImages.length > 0 && (
          <div className={styles.carouselWrap} data-reveal="">
            <Carousel images={carouselImages} single locale={locale} />
          </div>
        )}

        <div className={styles.leadTimeNote} data-reveal="">
          {t.leadTimeNote}
        </div>

        <div className={styles.eventTypes}>
          {t.eventTypes.map((row) => (
            <div key={row.label} className={styles.eventTypeRow} data-reveal="">
              <span>{row.label}</span>
              <span>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
