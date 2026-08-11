"use client";

import { setLocalStorageValue, useLocalStorageValue } from "@/lib/useLocalStorage";
import styles from "./CookieNotice.module.css";

const STORAGE_KEY = "cookie_notice_dismissed";

export function CookieNotice() {
  const dismissed = useLocalStorageValue(STORAGE_KEY);

  if (dismissed) return null;

  return (
    <div className={styles.bar} role="region" aria-label="הודעה על שימוש בעוגיות">
      <p className={styles.text}>
        האתר משתמש בעוגייה חיונית אחת בלבד לתפעול עגלת הקניות, ללא אנליטיקס או פרסום. פרטים
        נוספים ב<a href="/cookie-policy">מדיניות העוגיות</a> שלנו.
      </p>
      <button
        type="button"
        className={styles.accept}
        onClick={() => setLocalStorageValue(STORAGE_KEY, "1")}
      >
        הבנתי
      </button>
    </div>
  );
}
