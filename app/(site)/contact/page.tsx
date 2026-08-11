import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/ContactForm";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "יצירת קשר" };

export default function ContactPage() {
  return (
    <div className={styles.layout}>
      <div className={styles.introCol}>
        <div className={styles.eyebrow}>יצירת קשר</div>
        <h1>נשמח לשמוע מכם</h1>
        <p>שאלה על מוצר, בקשה מיוחדת, או סתם רוצים להגיד שלום — אפשר לפנות ישירות או למלא את הטופס.</p>

        <div className={styles.methods}>
          <div className={styles.row}>
            <span className={styles.label}>טלפון</span>
            <a className={styles.value} href="tel:0543737307">
              054-3737-307
            </a>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>אימייל</span>
            <a className={styles.value} href="mailto:roy@ybyroyoren.com">
              roy@ybyroyoren.com
            </a>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>אינסטגרם</span>
            <a className={styles.value} href="https://instagram.com/ybyroyoren" target="_blank" rel="noopener">
              @ybyroyoren
            </a>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>כתובת</span>
            <span className={styles.value} style={{ fontSize: 16 }}>
              רחוב השוק 34, תל אביב
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
              פתיחה בגוגל מפות
            </a>
            <a href="https://waze.com/ul?q=רחוב השוק 34 תל אביב" target="_blank" rel="noopener">
              פתיחה ב-Waze
            </a>
          </div>
        </div>
      </div>

      <div className={styles.formCol}>
        <h2>השאירו הודעה</h2>
        <p className={styles.formSub}>אחזור אליכם בדרך כלל תוך יום עסקים אחד</p>
        <ContactForm />
      </div>
    </div>
  );
}
