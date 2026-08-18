"use client";

import { useEffect, useState } from "react";
import { setLocalStorageValue, useLocalStorageValue } from "@/lib/useLocalStorage";
import { getDict, type Locale } from "@/lib/dictionary";
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

export function AccessibilityWidget({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);
  const raw = useLocalStorageValue(STORAGE_KEY);
  const prefs = parsePrefs(raw);
  const cookieNoticeVisible = !useLocalStorageValue(COOKIE_NOTICE_KEY);
  const buttonBottom = cookieNoticeVisible ? 92 : 28;
  const panelBottom = buttonBottom + 56;
  const t = getDict(locale).a11y;

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
        aria-label={t.buttonLabel}
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
          aria-label={t.buttonLabel}
        >
          <div className={styles.panelHead}>
            <h2>{t.heading}</h2>
            <button type="button" className={styles.close} aria-label={t.close} onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>

          <div className={styles.row}>
            <span>{t.fontSize}</span>
            <div className={styles.fontControls}>
              <button type="button" onClick={() => cycleFontSize(-1)} aria-label={t.decreaseFont}>
                {t.fontSmaller}
              </button>
              <button type="button" onClick={() => cycleFontSize(1)} aria-label={t.increaseFont}>
                {t.fontLarger}
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
            <span>{t.highContrast}</span>
            <span className={`${styles.switch} ${prefs.contrast ? styles.switchOn : ""}`} />
          </button>

          <button
            type="button"
            className={styles.row}
            style={{ width: "100%" }}
            onClick={() => toggle("underlineLinks")}
            aria-pressed={prefs.underlineLinks}
          >
            <span>{t.underlineLinks}</span>
            <span className={`${styles.switch} ${prefs.underlineLinks ? styles.switchOn : ""}`} />
          </button>

          <button
            type="button"
            className={styles.row}
            style={{ width: "100%" }}
            onClick={() => toggle("stopAnimations")}
            aria-pressed={prefs.stopAnimations}
          >
            <span>{t.stopAnimations}</span>
            <span className={`${styles.switch} ${prefs.stopAnimations ? styles.switchOn : ""}`} />
          </button>

          <button type="button" className={styles.reset} onClick={() => update(DEFAULT_PREFS)}>
            {t.reset}
          </button>

          <a href="/accessibility-statement" className={styles.statementLink}>
            {t.statementLink}
          </a>
        </div>
      )}
    </>
  );
}
