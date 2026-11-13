"use client";

import { computeSale } from "@/lib/kitchen/saleCalc";
import { formatPerGram } from "@/lib/kitchen/yield";
import { formatCurrencyExact } from "@/lib/pricing";
import styles from "@/app/admin/admin.module.css";

export interface ExtraRow {
  id: string;
  name: string;
  cost: string;
}

export interface VariantRow {
  id: string;
  grams: string;
  extras: ExtraRow[];
  mode: "price" | "foodcost";
  salePrice: string;
  foodCostPct: string;
}

export function newVariant(): VariantRow {
  return { id: crypto.randomUUID(), grams: "", extras: [], mode: "price", salePrice: "", foodCostPct: "" };
}

const box: React.CSSProperties = {
  border: "1.5px solid var(--line)",
  borderRadius: 12,
  padding: 14,
  marginBottom: 12,
  background: "var(--cream)",
};

/**
 * Pricing calculator for a recipe sold in the shop. The first line is the recipe itself (grams -> cost), then manual
 * extra costs (jar, label...), then a total, and either a sale price (-> food cost %) or a food cost % (-> price).
 * Several sizes can be added. Everything stays on the recipe screen.
 */
export function SaleCalculator({
  variants,
  setVariants,
  costPerGram,
  approximate,
  recipeName,
}: {
  variants: VariantRow[];
  setVariants: (updater: (rows: VariantRow[]) => VariantRow[]) => void;
  /** Cost of one gram of this recipe (null = grams of the recipe not entered yet). */
  costPerGram: number | null;
  approximate: boolean;
  recipeName: string;
}) {
  const patch = (id: string, change: Partial<VariantRow>) =>
    setVariants((rows) => rows.map((r) => (r.id === id ? { ...r, ...change } : r)));

  return (
    <div>
      {costPerGram === null && (
        <p className={styles.error} style={{ marginBottom: 10 }}>
          כדי לחשב את עלות המוצר צריך להזין למעלה &quot;סה״כ גרם שיוצא מהמתכון&quot; (ורכיבים עם כמויות).
        </p>
      )}
      {variants.map((row, index) => {
        const result = computeSale(
          {
            id: row.id,
            grams: Number(row.grams) || null,
            extras: row.extras.map((e) => ({ id: e.id, name: e.name, cost: Number(e.cost) || 0 })),
            mode: row.mode,
            salePrice: Number(row.salePrice) || null,
            foodCostPct: Number(row.foodCostPct) || null,
          },
          costPerGram
        );
        return (
          <div key={row.id} style={box}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <b>גודל {index + 1}</b>
              <button type="button" className={styles.btnDanger} onClick={() => setVariants((rows) => rows.filter((r) => r.id !== row.id))}>
                הסרת הגודל
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
              <span style={{ minWidth: 150, fontWeight: 600 }}>{recipeName.trim() || "המוצר"}</span>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="כמה גרם"
                value={row.grams}
                onChange={(e) => patch(row.id, { grams: e.target.value })}
                style={{ width: 110 }}
                aria-label="כמה גרם נמכר"
              />
              <span className={styles.muted}>גרם</span>
              <span className={`${styles.costBox} ${result.productCost === null ? styles.costBoxEmpty : ""}`}>
                {result.productCost === null ? "—" : formatCurrencyExact(result.productCost)}
                {approximate && result.productCost !== null ? "*" : ""}
              </span>
              {costPerGram !== null && <span className={styles.muted}>({formatPerGram(costPerGram)} לגרם)</span>}
            </div>

            {row.extras.map((extra) => (
              <div key={extra.id} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
                <input
                  value={extra.name}
                  placeholder="עלות נוספת (למשל: צנצנת)"
                  onChange={(e) =>
                    patch(row.id, { extras: row.extras.map((x) => (x.id === extra.id ? { ...x, name: e.target.value } : x)) })
                  }
                  style={{ minWidth: 150, flex: "0 1 220px" }}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="עלות ₪"
                  value={extra.cost}
                  onChange={(e) =>
                    patch(row.id, { extras: row.extras.map((x) => (x.id === extra.id ? { ...x, cost: e.target.value } : x)) })
                  }
                  style={{ width: 110 }}
                  aria-label="עלות"
                />
                <button
                  type="button"
                  className={styles.btnDanger}
                  onClick={() => patch(row.id, { extras: row.extras.filter((x) => x.id !== extra.id) })}
                >
                  הסרה
                </button>
              </div>
            ))}
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => patch(row.id, { extras: [...row.extras, { id: crypto.randomUUID(), name: "", cost: "" }] })}
            >
              + עלות נוספת
            </button>

            <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1.5px solid var(--ink)" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
                <span style={{ fontWeight: 700 }}>סה&quot;כ עלות:</span>
                <span className={styles.costBox} style={{ fontSize: 16, padding: "9px 16px" }}>
                  {formatCurrencyExact(result.totalCost)}
                </span>
                {result.extrasTotal > 0 && <span className={styles.muted}>מתוכו עלויות נוספות {formatCurrencyExact(result.extrasTotal)}</span>}
              </div>

              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 8 }}>
                <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontWeight: 400 }}>
                  <input type="radio" checked={row.mode === "price"} onChange={() => patch(row.id, { mode: "price" })} />
                  אני מזין מחיר מכירה
                </label>
                <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontWeight: 400 }}>
                  <input type="radio" checked={row.mode === "foodcost"} onChange={() => patch(row.id, { mode: "foodcost" })} />
                  אני מזין פוד קוסט
                </label>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                {row.mode === "price" ? (
                  <>
                    <span>מחיר מכירה ₪</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.salePrice}
                      onChange={(e) => patch(row.id, { salePrice: e.target.value })}
                      style={{ width: 120 }}
                    />
                    <span style={{ fontWeight: 700 }}>
                      פוד קוסט: {result.foodCostPct === null ? "—" : `${result.foodCostPct.toFixed(1)}%`}
                    </span>
                  </>
                ) : (
                  <>
                    <span>פוד קוסט %</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={row.foodCostPct}
                      onChange={(e) => patch(row.id, { foodCostPct: e.target.value })}
                      style={{ width: 100 }}
                    />
                    <span style={{ fontWeight: 700 }}>
                      מחיר מכירה: {result.salePrice === null ? "—" : formatCurrencyExact(result.salePrice)}
                    </span>
                  </>
                )}
                {result.profit !== null && <span className={styles.muted}>רווח למוצר: {formatCurrencyExact(result.profit)}</span>}
              </div>
              {result.productFoodCostPct !== null && result.extrasTotal > 0 && (
                <p className={styles.muted} style={{ marginTop: 6 }}>
                  פוד קוסט על המוצר בלבד (בלי העלויות הנוספות): {result.productFoodCostPct.toFixed(1)}%
                </p>
              )}
            </div>
          </div>
        );
      })}
      <button type="button" className={styles.btnSecondary} onClick={() => setVariants((rows) => [...rows, newVariant()])}>
        + גודל נוסף (למשל 200 גרם)
      </button>
    </div>
  );
}
