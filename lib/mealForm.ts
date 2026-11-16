// Options of the open-meal registration form. The site shows the label in the visitor's language; what is stored
// (and what the admin sees) is always the Hebrew label, so the data is consistent whatever language was used.
import type { Locale } from "@/lib/dictionary";

export type Gender = "male" | "female" | "other";

export interface FormOption {
  key: string;
  he: string;
  en: string;
}

export const GENDERS: (FormOption & { key: Gender })[] = [
  { key: "male", he: "זכר", en: "Male" },
  { key: "female", he: "נקבה", en: "Female" },
  { key: "other", he: "אחר", en: "Other" },
];

export const NO_RESTRICTIONS = "none";
export const OTHER_RESTRICTION = "other";

export const RESTRICTIONS: FormOption[] = [
  { key: NO_RESTRICTIONS, he: "ללא הגבלות", en: "No restrictions" },
  { key: "vegetarian", he: "צמחוני", en: "Vegetarian" },
  { key: "vegan", he: "טבעוני", en: "Vegan" },
  { key: "gluten_free", he: "ללא גלוטן", en: "Gluten-free" },
  { key: "lactose_free", he: "ללא לקטוז", en: "Lactose-free" },
  { key: "nut_allergy", he: "אלרגיה לאגוזים", en: "Nut allergy" },
  { key: "seafood_allergy", he: "אלרגיה לדגים/פירות ים", en: "Fish / seafood allergy" },
  { key: OTHER_RESTRICTION, he: "אחר", en: "Other" },
];

export const OTHER_OCCASION = "other";

export const OCCASIONS: FormOption[] = [
  { key: "birthday", he: "יום הולדת", en: "Birthday" },
  { key: "date", he: "דייט זוגי", en: "Date night" },
  { key: "friends", he: "כיף של חברים", en: "Fun with friends" },
  { key: "anniversary", he: "יום נישואין", en: "Anniversary" },
  { key: "cheer_up", he: "דווקא באים להנות אחרי משהו פחות טוב", en: "Coming to enjoy ourselves after something not so good" },
  { key: OTHER_OCCASION, he: "אחר", en: "Other" },
];

export const label = (option: FormOption, locale: Locale) => (locale === "en" ? option.en : option.he);

/** Hebrew labels for the given keys (unknown keys are dropped). */
export function hebrewLabels(options: FormOption[], keys: string[]): string[] {
  return keys.flatMap((k) => options.filter((o) => o.key === k).map((o) => o.he));
}
