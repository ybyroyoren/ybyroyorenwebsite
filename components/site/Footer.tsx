import Link from "next/link";
import { NewsletterForm } from "./NewsletterForm";
import { getDict, type Locale } from "@/lib/dictionary";
import styles from "./Footer.module.css";

export function Footer({ locale }: { locale: Locale }) {
  const t = getDict(locale).footer;

  return (
    <footer className={styles.footer} id="contact">
      <div className="wrap">
        <div className={styles.grid}>
          <div>
            <div className={styles.mark}>Y</div>
            <p>{t.tagline}</p>
          </div>
          <div className={styles.col}>
            <h4>{t.navHeading}</h4>
            <Link href="/shop">{t.navShop}</Link>
            <Link href="/meals">{t.navMeals}</Link>
            <Link href="/events">{t.navEvents}</Link>
          </div>
          <div className={styles.col}>
            <h4>{t.contactHeading}</h4>
            <a href="tel:0543737307">054-3737-307</a>
            <a href="mailto:roy@ybyroyoren.com">roy@ybyroyoren.com</a>
            <a
              href="https://instagram.com/ybyroyoren"
              target="_blank"
              rel="noopener"
              aria-label={t.instagramLabel}
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
            <h4>{t.updatesHeading}</h4>
            <p style={{ marginBottom: 14 }}>{t.updatesSub}</p>
            <NewsletterForm locale={locale} />
          </div>
        </div>
        <div className={styles.legal}>
          <Link href="/privacy-policy">{t.legal.privacy}</Link>
          <Link href="/cookie-policy">{t.legal.cookies}</Link>
          <Link href="/returns-policy">{t.legal.returns}</Link>
          <Link href="/shipping-policy">{t.legal.shipping}</Link>
          <Link href="/accessibility-statement">{t.legal.accessibility}</Link>
        </div>
        <div className={styles.bottom}>
          <div className={styles.bottomText}>
            <span>{t.copyright}</span>
            <span>{t.brand}</span>
          </div>
          <Link href="/admin/login" aria-label={t.adminLink} className={styles.iconLink}>
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
