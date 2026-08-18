"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { Locale } from "@/lib/dictionary";
import styles from "./LanguageToggle.module.css";

export function LanguageToggle({ locale, className }: { locale: Locale; className?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // pathname reflects the real requested URL (rewrites don't change it), so
  // Hebrew pages see it unprefixed ("/shop") and English pages see "/en/shop".
  const withoutPrefix = pathname.startsWith("/en") ? pathname.slice(3) || "/" : pathname;
  const target = locale === "he" ? `/en${withoutPrefix}` : withoutPrefix;
  const query = searchParams.toString();
  const href = query ? `${target}?${query}` : target;

  return (
    <Link
      href={href}
      className={`${styles.toggle} ${className ?? ""}`}
      aria-label={locale === "he" ? "Switch to English" : "עברית"}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.7 3.8 6 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-6-3.8-9s1.3-6.3 3.8-9z" />
      </svg>
      <span>{locale === "he" ? "EN" : "עב"}</span>
    </Link>
  );
}
