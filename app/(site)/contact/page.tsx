import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n";
import { getDict } from "@/lib/dictionary";
import { ContactForm } from "@/components/contact/ContactForm";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "יצירת קשר" };

export default async function ContactPage() {
  const locale = await getLocale();
  const t = getDict(locale).contact;

  return (
    <div className={styles.layout}>
      <div className={styles.introCol}>
        <div className={styles.eyebrow}>{t.eyebrow}</div>
        <h1>{t.heading}</h1>
        <p>{t.sub}</p>

        <div className={styles.methods}>
          <div className={styles.row}>
            <span className={styles.label}>{t.phoneLabel}</span>
            <a className={styles.value} href="tel:0543737307">
              054-3737-307
            </a>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>{t.emailLabel}</span>
            <a className={styles.value} href="mailto:roy@ybyroyoren.com">
              roy@ybyroyoren.com
            </a>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>{t.instagramLabel}</span>
            <a className={styles.value} href="https://instagram.com/ybyroyoren" target="_blank" rel="noopener">
              @ybyroyoren
            </a>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>{t.addressLabel}</span>
            <span className={styles.value} style={{ fontSize: 16 }}>
              {t.address}
            </span>
          </div>
        </div>

        <div className={styles.mapBlock}>
          <iframe
            className={styles.mapVisual}
            src={`https://www.google.com/maps?q=${encodeURIComponent("רחוב השוק 34, תל אביב")}&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="מפה — רחוב השוק 34, תל אביב"
          />
          <div className={styles.mapLinks}>
            <a
              href="https://www.google.com/maps/search/?api=1&query=רחוב+השוק+34+תל+אביב"
              target="_blank"
              rel="noopener"
            >
              {t.openInMaps}
            </a>
            <a href="https://waze.com/ul?q=רחוב השוק 34 תל אביב" target="_blank" rel="noopener">
              {t.openInWaze}
            </a>
          </div>
        </div>
      </div>

      <div className={styles.formCol}>
        <h2>{t.formHeading}</h2>
        <p className={styles.formSub}>{t.formSub}</p>
        <ContactForm locale={locale} />
      </div>
    </div>
  );
}
