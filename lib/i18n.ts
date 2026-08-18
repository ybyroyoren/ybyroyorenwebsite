import { notFound } from "next/navigation";
import { LOCALES, type Locale } from "@/lib/dictionary";

export type { Locale };

// The [locale] route segment gives us this as a plain string — narrow it to
// a real Locale, or 404 for anything else (there's no third locale).
export function resolveLocale(value: string): Locale {
  if ((LOCALES as readonly string[]).includes(value)) return value as Locale;
  notFound();
}

// Hebrew is unprefixed at the root ("/shop"); English lives under "/en"
// ("/en/shop"). Use this for every internal Link so navigation stays within
// the current language. `path` must start with "/".
export function localePath(locale: Locale, path: string): string {
  return locale === "en" ? `/en${path}` : path;
}
