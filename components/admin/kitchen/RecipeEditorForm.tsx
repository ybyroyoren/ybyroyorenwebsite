"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { KLEquipment, KLIngredient, KLRecipe, KLRecipeType } from "@/lib/kitchen/types";
import { ingredientLineCost } from "@/lib/kitchen/algorithms";
import { formatCurrencyExact } from "@/lib/pricing";
import styles from "@/app/admin/admin.module.css";

export interface RecipeOption {
  id: string;
  name: string;
  baseAmount: number;
  baseUnit: string;
  /** Cost of one base unit of this recipe (for pricing it as a component). */
  costPerBaseUnit: number;
  /** Some raw ingredient inside it has no price, so costPerBaseUnit is understated. */
  pricesIncomplete: boolean;
}

interface ComponentRow {
  kind: "ingredient" | "recipe";
  ingredientId: string;
  componentRecipeId: string;
  amount: string;
  bringOffsite: boolean;
}

interface StepRow {
  id: string;
  text: string;
}

interface EquipRow {
  equipId: string;
  qty: string;
}

interface BringNoteRow {
  id: string;
  text: string;
}

interface LineCost {
  /** null = the ingredient has no price set. */
  cost: number | null;
  /** The cost is understated because a nested ingredient has no price. */
  approximate: boolean;
}

function newId(): string {
  return crypto.randomUUID();
}

export function RecipeEditorForm({
  recipeId,
  initial,
  ingredients,
  recipeOptions,
  equipment,
}: {
  recipeId?: string;
  initial?: KLRecipe;
  ingredients: KLIngredient[];
  recipeOptions: RecipeOption[];
  equipment: KLEquipment[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<KLRecipeType>(initial?.type ?? "dish");
  const [baseAmount, setBaseAmount] = useState(initial ? String(initial.baseAmount) : "");
  const [baseUnit, setBaseUnit] = useState(initial?.baseUnit ?? "");
  const [components, setComponents] = useState<ComponentRow[]>(
    (initial?.components ?? []).map((c) => ({
      kind: c.kind,
      ingredientId: c.ingredientId ?? "",
      componentRecipeId: c.componentRecipeId ?? "",
      amount: String(c.amount),
      bringOffsite: c.bringOffsite,
    }))
  );
  const [steps, setSteps] = useState<StepRow[]>(initial?.prepSteps ?? []);
  const [prepEquip, setPrepEquip] = useState<EquipRow[]>(
    (initial?.prepEquipment ?? []).map((e) => ({ equipId: e.equipId, qty: String(e.qty) }))
  );
  const [eventEquip, setEventEquip] = useState<EquipRow[]>(
    (initial?.eventEquipment ?? []).map((e) => ({ equipId: e.equipId, qty: String(e.qty) }))
  );
  const [bringNotes, setBringNotes] = useState<BringNoteRow[]>(initial?.bringItems ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ingredientsById = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);
  const optionsById = useMemo(() => new Map(recipeOptions.map((r) => [r.id, r])), [recipeOptions]);

  // Same formula the recipe list and event costing use (yield loss included),
  // so these lines always add up to the recipe's price.
  function lineCost(row: ComponentRow): LineCost | null {
    const amount = Number(row.amount);
    if (!(amount > 0)) return null;
    if (row.kind === "ingredient") {
      const ingredient = ingredientsById.get(row.ingredientId);
      return ingredient ? { cost: ingredientLineCost(ingredient, amount), approximate: false } : null;
    }
    const option = optionsById.get(row.componentRecipeId);
    return option ? { cost: amount * option.costPerBaseUnit, approximate: option.pricesIncomplete } : null;
  }

  const lineCosts = components.map(lineCost);
  const totalCost = lineCosts.reduce((sum, l) => sum + (l?.cost ?? 0), 0);
  const unpricedLines = lineCosts.filter((l) => l && (l.cost === null || l.approximate)).length;
  const baseAmountNumber = Number(baseAmount);

  function updateComponent(index: number, patch: Partial<ComponentRow>) {
    setComponents((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }
  function removeComponent(index: number) {
    setComponents((rows) => rows.filter((_, i) => i !== index));
  }
  function updateStep(index: number, text: string) {
    setSteps((rows) => rows.map((r, i) => (i === index ? { ...r, text } : r)));
  }
  function removeStep(index: number) {
    setSteps((rows) => rows.filter((_, i) => i !== index));
  }
  function updateEquipRow(list: EquipRow[], setList: (r: EquipRow[]) => void, index: number, patch: Partial<EquipRow>) {
    setList(list.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("נא להזין שם");
    if (!baseUnit.trim()) return setError("נא להזין יחידת בסיס");
    if (!(Number(baseAmount) > 0)) return setError("כמות בסיס חייבת להיות גדולה מ-0");
    for (const c of components) {
      if (!(Number(c.amount) > 0)) return setError("כל רכיב חייב כמות גדולה מ-0");
      if (c.kind === "ingredient" && !c.ingredientId) return setError("נא לבחור מרכיב בכל שורה");
      if (c.kind === "recipe" && !c.componentRecipeId) return setError("נא לבחור מתכון בכל שורה");
    }

    const payload = {
      name: name.trim(),
      type,
      baseAmount: Number(baseAmount),
      baseUnit: baseUnit.trim(),
      components: components.map((c) => ({
        kind: c.kind,
        ingredientId: c.kind === "ingredient" ? c.ingredientId : null,
        componentRecipeId: c.kind === "recipe" ? c.componentRecipeId : null,
        amount: Number(c.amount),
        bringOffsite: c.bringOffsite,
      })),
      prepSteps: steps,
      prepEquipment: prepEquip.map((e) => ({ equipId: e.equipId, qty: Number(e.qty) || 1 })),
      eventEquipment: eventEquip.map((e) => ({ equipId: e.equipId, qty: Number(e.qty) || 1 })),
      bringItems: bringNotes.filter((n) => n.text.trim()),
    };

    setSaving(true);
    const url = recipeId ? `/api/admin/kitchen/recipes/${recipeId}` : "/api/admin/kitchen/recipes";
    const res = await fetch(url, {
      method: recipeId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "שמירה נכשלה");
      return;
    }
    router.push("/admin/kitchen/recipes");
    router.refresh();
  }

  async function handleDelete() {
    if (!recipeId) return;
    setSaving(true);
    await fetch(`/api/admin/kitchen/recipes/${recipeId}`, { method: "DELETE" });
    router.push("/admin/kitchen/recipes");
    router.refresh();
  }

  const equipRowEditor = (
    label: string,
    list: EquipRow[],
    setList: (r: EquipRow[]) => void
  ) => (
    <div className={styles.field} style={{ width: "100%" }}>
      <label>{label}</label>
      {list.map((row, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
          <select
            value={row.equipId}
            onChange={(e) => updateEquipRow(list, setList, i, { equipId: e.target.value })}
            style={{ flex: 1 }}
          >
            <option value="">בחר/י ציוד</option>
            {equipment.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            value={row.qty}
            onChange={(e) => updateEquipRow(list, setList, i, { qty: e.target.value })}
            style={{ width: 70 }}
          />
          <button type="button" className={styles.btnDanger} onClick={() => setList(list.filter((_, idx) => idx !== i))}>
            הסרה
          </button>
        </div>
      ))}
      <button type="button" className={styles.btnSecondary} onClick={() => setList([...list, { equipId: "", qty: "1" }])}>
        + ציוד
      </button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.field}>
        <label>סוג</label>
        <select value={type} onChange={(e) => setType(e.target.value as KLRecipeType)}>
          <option value="dish">מנה סופית</option>
          <option value="prep">הכנה</option>
        </select>
      </div>
      <div className={styles.field}>
        <label>שם</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required style={{ width: 220 }} />
      </div>
      <div className={styles.field}>
        <label>כמות בסיס</label>
        <input
          type="number"
          step="0.001"
          value={baseAmount}
          onChange={(e) => setBaseAmount(e.target.value)}
          style={{ width: 90 }}
        />
      </div>
      <div className={styles.field}>
        <label>יחידת בסיס</label>
        <input
          value={baseUnit}
          onChange={(e) => setBaseUnit(e.target.value)}
          placeholder="מנות / גרם / ליטר"
          style={{ width: 110 }}
        />
      </div>

      <div className={styles.field} style={{ width: "100%" }}>
        <label>רכיבים</label>
        {components.map((row, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center", flexWrap: "wrap" }}>
            <select
              value={row.kind}
              onChange={(e) => updateComponent(i, { kind: e.target.value as "ingredient" | "recipe" })}
              style={{ width: 110 }}
            >
              <option value="ingredient">מרכיב גלם</option>
              <option value="recipe">מתכון</option>
            </select>
            {row.kind === "ingredient" ? (
              <select
                value={row.ingredientId}
                onChange={(e) => updateComponent(i, { ingredientId: e.target.value })}
                style={{ flex: 1 }}
              >
                <option value="">בחר/י מרכיב</option>
                {ingredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} ({ing.unit})
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={row.componentRecipeId}
                onChange={(e) => updateComponent(i, { componentRecipeId: e.target.value })}
                style={{ flex: 1 }}
              >
                <option value="">בחר/י מתכון</option>
                {recipeOptions
                  .filter((r) => r.id !== recipeId)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.baseUnit})
                    </option>
                  ))}
              </select>
            )}
            <input
              type="number"
              step="0.001"
              placeholder="כמות"
              value={row.amount}
              onChange={(e) => updateComponent(i, { amount: e.target.value })}
              style={{ width: 90 }}
            />
            <span
              title="מחיר הרכיב לפי הכמות שהוזנה"
              style={{ minWidth: 84, textAlign: "left", fontWeight: 600, fontSize: 13.5 }}
            >
              {(() => {
                const line = lineCosts[i];
                if (!line) return <span className={styles.muted}>—</span>;
                if (line.cost === null) return <span style={{ color: "var(--danger)", fontWeight: 500 }}>אין מחיר</span>;
                return `${formatCurrencyExact(line.cost)}${line.approximate ? "*" : ""}`;
              })()}
            </span>
            <label
              title="נלקח לאירוע חוץ (גם אם הרכיב הוא הכנה בפני עצמה)"
              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5, whiteSpace: "nowrap" }}
            >
              <input
                type="checkbox"
                checked={row.bringOffsite}
                onChange={(e) => updateComponent(i, { bringOffsite: e.target.checked })}
              />
              לאירוע חוץ
            </label>
            <button type="button" className={styles.btnDanger} onClick={() => removeComponent(i)}>
              הסרה
            </button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => setComponents((c) => [...c, { kind: "ingredient", ingredientId: "", componentRecipeId: "", amount: "", bringOffsite: true }])}
          >
            + מרכיב גלם
          </button>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => setComponents((c) => [...c, { kind: "recipe", ingredientId: "", componentRecipeId: "", amount: "", bringOffsite: true }])}
          >
            + מתכון כרכיב
          </button>
        </div>
        <p className={styles.muted} style={{ marginTop: 6 }}>
          מרכיב חדש שלא ברשימה? הוסיפו אותו קודם במסך &quot;מרכיבים&quot;.
        </p>

        {components.length > 0 && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1.5px solid var(--ink)" }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              סה&quot;כ מחיר המרכיבים (מחיר המתכון): {formatCurrencyExact(totalCost)}
              {baseAmountNumber > 0 && baseUnit.trim() && (
                <span className={styles.muted} style={{ fontWeight: 400, marginRight: 10 }}>
                  · {formatCurrencyExact(totalCost / baseAmountNumber)} ל{baseUnit.trim()}
                </span>
              )}
            </div>
            <p className={styles.muted} style={{ marginTop: 4 }}>
              המחיר הוא עבור כמות הבסיס של המתכון{baseAmountNumber > 0 ? ` (${baseAmountNumber} ${baseUnit.trim()})` : ""}.
              {unpricedLines > 0 &&
                ` * חסר מחיר ל-${unpricedLines === 1 ? "רכיב אחד" : `${unpricedLines} רכיבים`} — הסכום חלקי. אפשר להוסיף מחיר במסך "מרכיבים".`}
            </p>
          </div>
        )}
      </div>

      <div className={styles.field} style={{ width: "100%" }}>
        <label>שלבי הכנה</label>
        {steps.map((step, i) => (
          <div key={step.id} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <span style={{ paddingTop: 10 }}>{i + 1}.</span>
            <input value={step.text} onChange={(e) => updateStep(i, e.target.value)} style={{ flex: 1 }} />
            <button type="button" className={styles.btnDanger} onClick={() => removeStep(i)}>
              הסרה
            </button>
          </div>
        ))}
        <button type="button" className={styles.btnSecondary} onClick={() => setSteps((s) => [...s, { id: newId(), text: "" }])}>
          + שלב
        </button>
      </div>

      {equipRowEditor("ציוד הכנה (בבית, לא נלקח לאירוע)", prepEquip, setPrepEquip)}
      {equipRowEditor("ציוד לקחת לאירוע", eventEquip, setEventEquip)}

      <div className={styles.field} style={{ width: "100%" }}>
        <label>פריטים נוספים לקחת לאירוע חוץ (טקסט חופשי)</label>
        {bringNotes.map((note, i) => (
          <div key={note.id} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <input
              value={note.text}
              onChange={(e) => setBringNotes((rows) => rows.map((r, idx) => (idx === i ? { ...r, text: e.target.value } : r)))}
              placeholder="למשל: סכו״ם חד פעמי, קרח, מפיות"
              style={{ flex: 1 }}
            />
            <button type="button" className={styles.btnDanger} onClick={() => setBringNotes((rows) => rows.filter((_, idx) => idx !== i))}>
              הסרה
            </button>
          </div>
        ))}
        <button type="button" className={styles.btnSecondary} onClick={() => setBringNotes((rows) => [...rows, { id: newId(), text: "" }])}>
          + פריט
        </button>
        <p className={styles.muted} style={{ marginTop: 6 }}>
          מופיע ברשימת &quot;פריטים והכנות לקחת&quot; של כל אירוע חוץ שהמתכון הזה בתפריט שלו.
        </p>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" className={styles.btn} disabled={saving}>
          {saving ? "שומר..." : "שמירה"}
        </button>
        {recipeId && (
          <button type="button" className={styles.btnDanger} onClick={handleDelete} disabled={saving}>
            מחיקת מתכון
          </button>
        )}
      </div>
    </form>
  );
}
