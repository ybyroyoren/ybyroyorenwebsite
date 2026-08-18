import "server-only";
import { cookies } from "next/headers";
import { type Locale, getDict } from "@/lib/dictionary";
import { LOCALE_COOKIE } from "@/lib/i18n-client";

export { LOCALE_COOKIE };
export const DEFAULT_LOCALE: Locale = "he";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return store.get(LOCALE_COOKIE)?.value === "en" ? "en" : DEFAULT_LOCALE;
}

export async function getLocaleDict() {
  const locale = await getLocale();
  return { locale, dict: getDict(locale) };
}
