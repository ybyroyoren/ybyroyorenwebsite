// Seat-display logic for open meals — spec §5.
// The stored/queried numbers (meal_availability view) are always exact; only
// the customer-facing label and meter width are tiered.
import { getDict, type Locale } from "@/lib/dictionary";
import type { SeatsMeterMode, SeatsTextMode } from "@/lib/supabase/types";

/** `taken` = diners registered so far: nobody yet reads "open for registration", from the first diner on "filling up". */
export function seatsLabel(remaining: number, locale: Locale = "he", taken = 0): string {
  const t = getDict(locale).meals.seatsLabel;
  if (remaining <= 0) return t.full;
  if (remaining <= 7) return t.remaining(remaining);
  if (remaining <= 13) return t.fewLeft;
  return taken > 0 ? t.filling : t.available;
}

export function seatsDisplayPct(remaining: number, totalSeats: number, takenSeats: number): number {
  if (remaining <= 0) return 100;
  if (remaining <= 7) return (takenSeats / totalSeats) * 100;
  if (remaining <= 13) return 50;
  return takenSeats > 0 ? 25 : 12.5; // an empty meal starts at 12.5%, 25% from the first diner
}

export function isLowSeats(remaining: number): boolean {
  return remaining > 0 && remaining <= 7;
}

// ---------- per-meal display settings (admin → open meals → "display on the site") ----------

export const FEW_LEFT_AT = 13; // "only a few left" means this many seats free or fewer

export interface SeatsDisplayInput {
  remaining: number;
  total: number;
  taken: number;
  textMode: SeatsTextMode;
  textHe: string;
  textEn: string;
  meterMode: SeatsMeterMode;
}

export interface SeatsDisplay {
  /** null = show no text. */
  label: string | null;
  /** null = show no meter. 0-100. */
  pct: number | null;
  /** Red "few left" styling (only for the real numeric wording). */
  low: boolean;
  /** True when visitors can't register: really full, or the owner closed registration (mode "full"). */
  closed: boolean;
}

/**
 * What a visitor sees for one meal's seats. The text and the meter are chosen separately by the owner.
 * Everything that states a fact stays true to the real numbers: "few left" only appears when few really are
 * left, "N seats left" always uses the real N, and a really full meal always says full.
 */
export function seatsDisplay(m: SeatsDisplayInput, locale: Locale = "he"): SeatsDisplay {
  const t = getDict(locale).meals.seatsLabel;
  const reallyFull = m.remaining <= 0;
  const closed = reallyFull || m.textMode === "full";

  let label: string | null;
  if (reallyFull || m.textMode === "full") label = t.full;
  else
    switch (m.textMode) {
      case "hidden":
        label = null;
        break;
      case "open":
        label = t.available;
        break;
      case "few":
        label = m.remaining <= FEW_LEFT_AT ? t.fewLeft : m.taken > 0 ? t.filling : t.available;
        break;
      case "exact":
        label = t.remaining(m.remaining);
        break;
      case "custom": {
        const custom = (locale === "en" ? m.textEn || m.textHe : m.textHe).trim();
        label = custom || seatsLabel(m.remaining, locale, m.taken);
        break;
      }
      default:
        label = seatsLabel(m.remaining, locale, m.taken);
    }

  let pct: number | null;
  if (m.meterMode === "hidden") pct = null;
  else if (reallyFull || m.textMode === "full") pct = 100;
  else if (m.meterMode === "real") pct = m.total > 0 ? Math.min(100, (m.taken / m.total) * 100) : 0;
  else pct = seatsDisplayPct(m.remaining, m.total, m.taken);

  const numeric = m.textMode === "auto" || m.textMode === "exact";
  return { label, pct, low: numeric && isLowSeats(m.remaining) && !closed, closed };
}
