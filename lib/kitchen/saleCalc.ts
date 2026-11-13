// Pricing calculator for a recipe sold in the shop (kept on the recipe screen only).
import type { KLSaleVariant } from "./types";

export interface SaleResult {
  /** Cost of the recipe itself for the chosen grams (null = grams or cost per gram unknown). */
  productCost: number | null;
  extrasTotal: number;
  totalCost: number;
  salePrice: number | null;
  /** Food cost % of the total cost (product + extras) out of the sale price. */
  foodCostPct: number | null;
  /** Same, product only (without jars, labels...). */
  productFoodCostPct: number | null;
  profit: number | null;
}

export function computeSale(v: KLSaleVariant, costPerGram: number | null): SaleResult {
  const productCost = v.grams && v.grams > 0 && costPerGram !== null ? v.grams * costPerGram : null;
  const extrasTotal = v.extras.reduce((sum, e) => sum + (e.cost > 0 ? e.cost : 0), 0);
  const totalCost = (productCost ?? 0) + extrasTotal;

  let salePrice: number | null = null;
  if (v.mode === "price") {
    salePrice = v.salePrice && v.salePrice > 0 ? v.salePrice : null;
  } else if (v.foodCostPct && v.foodCostPct > 0 && totalCost > 0) {
    salePrice = totalCost / (v.foodCostPct / 100);
  }

  return {
    productCost,
    extrasTotal,
    totalCost,
    salePrice,
    foodCostPct: salePrice && totalCost > 0 ? (totalCost / salePrice) * 100 : null,
    productFoodCostPct: salePrice && productCost !== null ? (productCost / salePrice) * 100 : null,
    profit: salePrice ? salePrice - totalCost : null,
  };
}

/** Cleans untrusted variants (from the API) into a safe, small shape. */
export function cleanSaleVariants(raw: unknown): KLSaleVariant[] {
  if (!Array.isArray(raw)) return [];
  const num = (v: unknown): number | null => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 1e6) / 1e6 : null;
  };
  return raw.slice(0, 20).map((item) => {
    const v = (item ?? {}) as Record<string, unknown>;
    const extras = Array.isArray(v.extras) ? v.extras.slice(0, 30) : [];
    return {
      id: String(v.id ?? crypto.randomUUID()).slice(0, 60),
      grams: num(v.grams),
      extras: extras.map((e) => {
        const x = (e ?? {}) as Record<string, unknown>;
        return { id: String(x.id ?? crypto.randomUUID()).slice(0, 60), name: String(x.name ?? "").trim().slice(0, 80), cost: num(x.cost) ?? 0 };
      }),
      mode: v.mode === "foodcost" ? "foodcost" : "price",
      salePrice: num(v.salePrice),
      foodCostPct: num(v.foodCostPct),
    };
  });
}
