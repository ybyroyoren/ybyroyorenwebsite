"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Locale } from "@/lib/dictionary";
import { LOCALE_COOKIE } from "@/lib/i18n-client";
import styles from "./LanguageToggle.module.css";

export function LanguageToggle({ locale, className }: { locale: Locale; className?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next: Locale = locale === "he" ? "en" : "he";
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      className={`${styles.toggle} ${className ?? ""}`}
      onClick={toggle}
      disabled={isPending}
      aria-label={locale === "he" ? "Switch to English" : "עברית"}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.7 3.8 6 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-6-3.8-9s1.3-6.3 3.8-9z" />
      </svg>
      <span>{locale === "he" ? "EN" : "עב"}</span>
    </button>
  );
}
