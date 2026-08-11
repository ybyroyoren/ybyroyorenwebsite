import Link from "next/link";
import { NewsletterForm } from "./NewsletterForm";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer} id="contact">
      <div className="wrap">
        <div className={styles.grid}>
          <div>
            <div className={styles.mark}>Y</div>
            <p>שף פרטי לאירועים וארוחות פתוחות - מכל הלב, מהמטבח שלי</p>
          </div>
          <div className={styles.col}>
            <h4>ניווט</h4>
            <Link href="/shop">חנות</Link>
            <Link href="/meals">ארוחות</Link>
            <Link href="/events">אירועים פרטיים</Link>
          </div>
          <div className={styles.col}>
            <h4>יצירת קשר</h4>
            <a href="tel:0543737307">054-3737-307</a>
            <a href="mailto:roy@ybyroyoren.com">roy@ybyroyoren.com</a>
            <a
              href="https://instagram.com/ybyroyoren"
              target="_blank"
              rel="noopener"
              aria-label="Instagram"
              className={styles.iconLink}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4.2" />
                <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none" />
              </svg>
            </a>
          </div>
          <div className={styles.col}>
            <h4>עדכונים</h4>
            <p style={{ marginBottom: 14 }}>ארוחות חדשות ומוצרים ישר למייל</p>
            <NewsletterForm />
          </div>
        </div>
        <div className={styles.legal}>
          <Link href="/privacy-policy">מדיניות פרטיות</Link>
          <Link href="/cookie-policy">מדיניות עוגיות</Link>
          <Link href="/returns-policy">מדיניות החזרות</Link>
          <Link href="/shipping-policy">מדיניות משלוחים</Link>
          <Link href="/accessibility-statement">הצהרת נגישות</Link>
        </div>
        <div className={styles.bottom}>
          <div className={styles.bottomText}>
            <span>© 2026 Roy Oren</span>
            <span>Y by Roy Oren</span>
          </div>
          <Link href="/admin/login" aria-label="כניסת מנהלים" className={styles.iconLink}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="5" y="10.5" width="14" height="9" rx="2" />
              <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
            </svg>
          </Link>
        </div>
      </div>
    </footer>
  );
}
