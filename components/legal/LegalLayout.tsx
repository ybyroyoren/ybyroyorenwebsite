import { getDict, type Locale } from "@/lib/dictionary";
import styles from "./LegalLayout.module.css";

export function LegalLayout({
  eyebrow,
  title,
  updated,
  locale,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  locale: Locale;
  children: React.ReactNode;
}) {
  const t = getDict(locale).legal;

  return (
    <div className={`wrap ${styles.page}`}>
      <div className={styles.eyebrow}>{eyebrow}</div>
      <h1>{title}</h1>
      <p className={styles.updated}>
        {t.updated} {updated}
      </p>
      {t.englishNotice && <p className={styles.englishNotice}>{t.englishNotice}</p>}
      <div className={styles.body}>{children}</div>
    </div>
  );
}
