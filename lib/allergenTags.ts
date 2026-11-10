// Pure helpers for allergen tags (safe to import from Client Components).

export interface AllergenTag {
  id: string;
  labelHe: string;
  labelEn: string;
  color: string; // "#rrggbb"
}

export function allergenLabel(tag: AllergenTag, locale: "he" | "en"): string {
  return (locale === "en" && tag.labelEn) || tag.labelHe;
}

/** Black or white text, whichever reads better on the tag's background color. */
export function tagTextColor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#171410";
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.4 ? "#171410" : "#ffffff";
}
