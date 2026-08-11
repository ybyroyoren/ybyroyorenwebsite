"use client";

import { useEffect, useState } from "react";
import { setLocalStorageValue, useLocalStorageValue } from "@/lib/useLocalStorage";
import styles from "./AccessibilityWidget.module.css";

const COOKIE_NOTICE_KEY = "cookie_notice_dismissed";

type FontSize = "normal" | "large" | "larger";

interface A11yPrefs {
  fontSize: FontSize;
  contrast: boolean;
  underlineLinks: boolean;
  stopAnimations: boolean;
}

const DEFAULT_PREFS: A11yPrefs = {
  fontSize: "normal",
  contrast: false,
  underlineLinks: false,
  stopAnimations: false,
};

const STORAGE_KEY = "a11y_prefs";
const FONT_SIZES: FontSize[] = ["normal", "large", "larger"];

function parsePrefs(raw: string | null): A11yPrefs {
  if (!raw) return DEFAULT_PREFS;
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const raw = useLocalStorageValue(STORAGE_KEY);
  const prefs = parsePrefs(raw);
  const cookieNoticeVisible = !useLocalStorageValue(COOKIE_NOTICE_KEY);
  const buttonBottom = cookieNoticeVisible ? 92 : 28;
  const panelBottom = buttonBottom + 56;

  // Synchronizes React state -> the DOM (globals.css reads these attributes).
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("data-a11y-font-size", prefs.fontSize);
    html.setAttribute("data-a11y-contrast", String(prefs.contrast));
    html.setAttribute("data-a11y-underline-links", String(prefs.underlineLinks));
    html.setAttribute("data-a11y-stop-animations", String(prefs.stopAnimations));
  }, [prefs.fontSize, prefs.contrast, prefs.underlineLinks, prefs.stopAnimations]);

  function update(next: A11yPrefs) {
    setLocalStorageValue(STORAGE_KEY, JSON.stringify(next));
  }

  function cycleFontSize(direction: 1 | -1) {
    const idx = FONT_SIZES.indexOf(prefs.fontSize);
    const nextIdx = Math.min(FONT_SIZES.length - 1, Math.max(0, idx + direction));
    update({ ...prefs, fontSize: FONT_SIZES[nextIdx] });
  }

  function toggle(key: "contrast" | "underlineLinks" | "stopAnimations") {
    update({ ...prefs, [key]: !prefs[key] });
  }

  return (
    <>
      <button
        type="button"
        className={styles.button}
        style={{ bottom: buttonBottom }}
        aria-label="תפריט נגישות"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        ♿
      </button>

      {open && (
        <div
          className={styles.panel}
          style={{ bottom: panelBottom }}
          role="dialog"
          aria-label="תפריט נגישות"
        >
          <div className={styles.panelHead}>
            <h2>נגישות</h2>
            <button type="button" className={styles.close} aria-label="סגירה" onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>

          <div className={styles.row}>
            <span>גודל טקסט</span>
            <div className={styles.fontControls}>
              <button type="button" onClick={() => cycleFontSize(-1)} aria-label="הקטנת טקסט">
                א-
              </button>
              <button type="button" onClick={() => cycleFontSize(1)} aria-label="הגדלת טקסט">
                א+
              </button>
            </div>
          </div>

          <button
            type="button"
            className={styles.row}
            style={{ width: "100%" }}
            onClick={() => toggle("contrast")}
            aria-pressed={prefs.contrast}
          >
            <span>ניגודיות גבוהה</span>
            <span className={`${styles.switch} ${prefs.contrast ? styles.switchOn : ""}`} />
          </button>

          <button
            type="button"
            className={styles.row}
            style={{ width: "100%" }}
            onClick={() => toggle("underlineLinks")}
            aria-pressed={prefs.underlineLinks}
          >
            <span>הדגשת קישורים</span>
            <span className={`${styles.switch} ${prefs.underlineLinks ? styles.switchOn : ""}`} />
          </button>

          <button
            type="button"
            className={styles.row}
            style={{ width: "100%" }}
            onClick={() => toggle("stopAnimations")}
            aria-pressed={prefs.stopAnimations}
          >
            <span>עצירת אנימציות</span>
            <span className={`${styles.switch} ${prefs.stopAnimations ? styles.switchOn : ""}`} />
          </button>

          <button type="button" className={styles.reset} onClick={() => update(DEFAULT_PREFS)}>
            איפוס הגדרות
          </button>

          <a href="/accessibility-statement" className={styles.statementLink}>
            הצהרת נגישות
          </a>
        </div>
      )}
    </>
  );
}
