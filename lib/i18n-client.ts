// Plain constant, safe to import from Client Components. lib/i18n.ts (which
// reads the cookie server-side via next/headers) re-exports this too, so
// server code only needs to import from one place.
export const LOCALE_COOKIE = "locale";
