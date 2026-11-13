// How much a recipe yields: total grams and number of portions. These are stored in the recipe's base amount /
// base unit (the cost and event engines keep working in base units): "מנות" when the portion count is known,
// otherwise "גרם". Pure helpers, safe for client and server.

export const PORTION_UNIT = "מנות";
export const GRAM_UNIT = "גרם";

interface YieldSource {
  baseAmount: number;
  baseUnit: string;
  totalGrams: number | null;
}

/** Number of portions the recipe yields, or null if it isn't measured in portions. */
export function recipePortions(r: Pick<YieldSource, "baseAmount" | "baseUnit">): number | null {
  return r.baseUnit.trim() === PORTION_UNIT && r.baseAmount > 0 ? r.baseAmount : null;
}

/** Total grams the recipe yields, or null if unknown. */
export function recipeGrams(r: YieldSource): number | null {
  if (r.totalGrams && r.totalGrams > 0) return r.totalGrams;
  return r.baseUnit.trim() === GRAM_UNIT && r.baseAmount > 0 ? r.baseAmount : null;
}

/** The base amount / unit to store for a recipe, from what was entered. Portions win; otherwise grams. */
export function deriveBase(totalGrams: number | null, portions: number | null): { amount: number; unit: string } | null {
  if (portions && portions > 0) return { amount: Math.round(portions * 1e6) / 1e6, unit: PORTION_UNIT };
  if (totalGrams && totalGrams > 0) return { amount: totalGrams, unit: GRAM_UNIT };
  return null;
}

/** A cost per gram needs more decimals than an ordinary price (₪0.0123 per gram is normal). */
export function formatPerGram(amount: number): string {
  return `₪${amount.toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}
