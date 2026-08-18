// Seat-display logic for open meals — spec §5.
// The stored/queried numbers (meal_availability view) are always exact; only
// the customer-facing label and meter width are tiered.
import { getDict, type Locale } from "@/lib/dictionary";

export function seatsLabel(remaining: number, locale: Locale = "he"): string {
  const t = getDict(locale).meals.seatsLabel;
  if (remaining <= 0) return t.full;
  if (remaining <= 7) return t.remaining(remaining);
  if (remaining <= 13) return t.fewLeft;
  return t.available;
}

export function seatsDisplayPct(remaining: number, totalSeats: number, takenSeats: number): number {
  if (remaining <= 0) return 100;
  if (remaining <= 7) return (takenSeats / totalSeats) * 100;
  if (remaining <= 13) return 50;
  return 25;
}

export function isLowSeats(remaining: number): boolean {
  return remaining > 0 && remaining <= 7;
}
