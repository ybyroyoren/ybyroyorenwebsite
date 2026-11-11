// Pure helpers for the invoice-item price model (no server-only imports, usable anywhere).
import type { KLIngredient, KLInvoiceItem } from "./types";
import type { IngredientMap, RecipeMap } from "./algorithms";
import { recipeBaseCost } from "./algorithms";

/** Price per measure unit (gram, ml, piece) of one form: price_net / units per purchase unit. */
export function pricePerUnit(priceNet: number | null, unitsPerPurchaseUnit: number): number | null {
  if (priceNet === null || !(unitsPerPurchaseUnit > 0)) return null;
  return priceNet / unitsPerPurchaseUnit;
}

// ---------- unit classes, for sanity warnings ----------

type UnitClass = "kg" | "g" | "l" | "ml" | "piece" | "other";

function purchaseClass(unit: string): UnitClass {
  const u = unit.trim().toLowerCase();
  if (/^(ק["״']?ג|קילו|קילוגרם|kg)/.test(u)) return "kg";
  if (/^(גרם|גר['׳]?|g)$/.test(u)) return "g";
  if (/^(ליטר|ל['׳]?|liter|l)$/.test(u)) return "l";
  if (/^(מ["״']?ל|מיליליטר|ml)$/.test(u)) return "ml";
  if (/^(יח|יחידה|יחידות|קלח|קלחים|פרי|צרור|שק|מארז|קרטון|תבנית|בקבוק|שקית|חבילה|קופסה|ארגז)/.test(u)) return "piece";
  return "other";
}

function measureClass(unit: string): UnitClass {
  const u = unit.trim().toLowerCase();
  if (/^גרם|^g$/.test(u)) return "g";
  if (/^מ["״']?ל|^ml$/.test(u)) return "ml";
  if (/^(יח|יחידה)/.test(u)) return "piece";
  return "other";
}

/** Warnings only — prices are never changed automatically. */
export function formWarnings(item: Pick<KLInvoiceItem, "purchaseUnit" | "priceNet">, form: Pick<KLIngredient, "unit" | "unitsPerPurchaseUnit" | "name">): string[] {
  const out: string[] = [];
  const p = purchaseClass(item.purchaseUnit);
  const m = measureClass(form.unit);
  const n = form.unitsPerPurchaseUnit;
  if (p === "kg" && m === "g" && n !== 1000) out.push(`ביחידת קנייה של ק״ג מצופים 1000 גרם, ובמרכיב "${form.name}" מוגדרים ${n}.`);
  if (p === "g" && m === "g" && n !== 1) out.push(`יחידת הקנייה היא גרם, אבל "${form.name}" מוגדר עם ${n} ${form.unit} ליחידה (מצופה 1).`);
  if (p === "l" && m === "ml" && n !== 1000) out.push(`ביחידת קנייה של ליטר מצופים 1000 מ״ל, ובמרכיב "${form.name}" מוגדרים ${n}.`);
  if (p === "ml" && m === "ml" && n !== 1) out.push(`יחידת הקנייה היא מ״ל, אבל "${form.name}" מוגדר עם ${n} ${form.unit} ליחידה (מצופה 1).`);
  if ((p === "kg" && m === "ml") || (p === "l" && m === "g")) out.push(`יחידת הקנייה (${item.purchaseUnit}) לא מתאימה ליחידת המדידה של "${form.name}" (${form.unit}).`);
  const per = pricePerUnit(item.priceNet, n);
  if (per !== null && (m === "g" || m === "ml") && per > 1) out.push(`מחיר גבוה מאוד: ${formatNum(per * 1000)} ל-1000 ${form.unit} ב"${form.name}". לבדוק את המחיר והיחידה מול החשבונית.`);
  return out;
}

/** Price per kilogram of an item bought by weight (by the kg or by the gram), else null. */
export function pricePerKg(item: Pick<KLInvoiceItem, "purchaseUnit" | "priceNet">): number | null {
  if (item.priceNet === null) return null;
  const c = purchaseClass(item.purchaseUnit);
  if (c === "kg") return item.priceNet;
  if (c === "g") return item.priceNet * 1000;
  return null;
}

/** Items whose per-kg price is far above the typical one (compared with all items bought by weight). */
export function priceOutlierIds(items: KLInvoiceItem[]): Set<string> {
  const prices = items.map(pricePerKg).filter((p): p is number => p !== null).sort((a, b) => a - b);
  if (prices.length < 8) return new Set();
  const median = prices[Math.floor(prices.length / 2)];
  const limit = Math.max(median * 5, 100);
  return new Set(items.filter((i) => (pricePerKg(i) ?? 0) > limit).map((i) => i.id));
}

export function outlierWarning(item: KLInvoiceItem): string {
  return `מחיר גבוה בהרבה ממרבית הפריטים שנקנים לפי משקל: ${formatNum(pricePerKg(item) ?? 0)} לק״ג. לבדוק מול החשבונית.`;
}

export function formatNum(n: number): string {
  return new Intl.NumberFormat("he-IL", { maximumFractionDigits: 4 }).format(n);
}

// ---------- preview of a change before it is saved ----------

export interface ProposedFormChange {
  ingredientId: string;
  unitsPerPurchaseUnit?: number;
  yieldPercent?: number | null;
}

export interface ProposedChange {
  /** New net price for this invoice item (undefined = unchanged). */
  itemId?: string;
  priceNet?: number | null;
  /** Edits to individual forms. */
  forms?: ProposedFormChange[];
  /** Existing ingredient relinked to `itemId` (manual merge), with its new units-per-purchase-unit. */
  relink?: { ingredientId: string; itemPriceNet: number | null; unitsPerPurchaseUnit: number };
}

export interface CostPreview {
  ingredients: { id: string; name: string; unit: string; oldPrice: number | null; newPrice: number | null; oldYield: number | null; newYield: number | null }[];
  recipes: { id: string; name: string; oldCost: number; newCost: number; changePct: number | null }[];
  bigPriceChange: { oldPrice: number; newPrice: number; pct: number } | null;
}

export function previewCostChange(
  change: ProposedChange,
  items: Map<string, KLInvoiceItem>,
  ingredientsById: IngredientMap,
  recipesById: RecipeMap
): CostPreview {
  const after: IngredientMap = new Map(ingredientsById);
  const touched: string[] = [];

  const item = change.itemId ? items.get(change.itemId) : undefined;
  const newNet = change.priceNet === undefined ? (item?.priceNet ?? null) : change.priceNet;
  if (item && change.priceNet !== undefined) {
    for (const ing of ingredientsById.values()) {
      if (ing.invoiceItemId !== item.id) continue;
      const formChange = change.forms?.find((f) => f.ingredientId === ing.id);
      const units = formChange?.unitsPerPurchaseUnit ?? ing.unitsPerPurchaseUnit;
      after.set(ing.id, { ...ing, price: pricePerUnit(newNet, units), unitsPerPurchaseUnit: units, yieldPercent: formChange && "yieldPercent" in formChange ? (formChange.yieldPercent ?? null) : ing.yieldPercent });
      touched.push(ing.id);
    }
  }
  for (const f of change.forms ?? []) {
    if (touched.includes(f.ingredientId)) continue;
    const ing = ingredientsById.get(f.ingredientId);
    if (!ing) continue;
    const it = ing.invoiceItemId ? items.get(ing.invoiceItemId) : undefined;
    const units = f.unitsPerPurchaseUnit ?? ing.unitsPerPurchaseUnit;
    after.set(ing.id, {
      ...ing,
      unitsPerPurchaseUnit: units,
      price: it ? pricePerUnit(it.priceNet, units) : ing.price,
      yieldPercent: "yieldPercent" in f ? (f.yieldPercent ?? null) : ing.yieldPercent,
    });
    touched.push(ing.id);
  }
  if (change.relink) {
    const ing = ingredientsById.get(change.relink.ingredientId);
    if (ing) {
      after.set(ing.id, { ...ing, unitsPerPurchaseUnit: change.relink.unitsPerPurchaseUnit, price: pricePerUnit(change.relink.itemPriceNet, change.relink.unitsPerPurchaseUnit) });
      touched.push(ing.id);
    }
  }

  const changedIngredients = touched
    .map((id) => {
      const o = ingredientsById.get(id)!;
      const n = after.get(id)!;
      return { id, name: o.name, unit: o.unit, oldPrice: o.price, newPrice: n.price, oldYield: o.yieldPercent, newYield: n.yieldPercent };
    })
    .filter((r) => !(samePrice(r.oldPrice, r.newPrice) && r.oldYield === r.newYield));

  const recipes: CostPreview["recipes"] = [];
  if (changedIngredients.length > 0) {
    for (const r of recipesById.values()) {
      const oldCost = recipeBaseCost(r.id, recipesById, ingredientsById);
      const newCost = recipeBaseCost(r.id, recipesById, after);
      if (Math.abs(oldCost - newCost) > 0.0001) {
        recipes.push({ id: r.id, name: r.name, oldCost, newCost, changePct: oldCost > 0 ? ((newCost - oldCost) / oldCost) * 100 : null });
      }
    }
  }

  let bigPriceChange: CostPreview["bigPriceChange"] = null;
  if (item && change.priceNet !== undefined && item.priceNet !== null && change.priceNet !== null && item.priceNet > 0) {
    const pct = ((change.priceNet - item.priceNet) / item.priceNet) * 100;
    if (Math.abs(pct) > 35) bigPriceChange = { oldPrice: item.priceNet, newPrice: change.priceNet, pct };
  }
  return { ingredients: changedIngredients, recipes, bigPriceChange };
}

function samePrice(a: number | null, b: number | null): boolean {
  if (a === null || b === null) return a === b;
  return Math.abs(a - b) < 1e-9;
}
