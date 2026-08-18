"use client";

import { setLocalStorageValue, useLocalStorageValue } from "@/lib/useLocalStorage";
import { getDict, type Locale } from "@/lib/dictionary";
import styles from "./CookieNotice.module.css";

const STORAGE_KEY = "cookie_notice_dismissed";

export function CookieNotice({ locale }: { locale: Locale }) {
  const dismissed = useLocalStorageValue(STORAGE_KEY);
  const t = getDict(locale).cookieNotice;

  if (dismissed) return null;

  return (
    <div className={styles.bar} role="region" aria-label={t.ariaLabel}>
      <p className={styles.text}>
        {t.textBefore}
        <a href="/cookie-policy">{t.linkText}</a>
        {t.textAfter}
      </p>
      <button
        type="button"
        className={styles.accept}
        onClick={() => setLocalStorageValue(STORAGE_KEY, "1")}
      >
        {t.accept}
      </button>
    </div>
  );
}
