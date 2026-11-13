import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getRecipes } from "./data";
import { wouldCreateCycle } from "./algorithms";
import { deriveBase } from "./yield";
import { cleanSaleVariants } from "./saleCalc";
import type { KLBringNote, KLEquipRef, KLPrepStep, KLRecipeType, KLSaleVariant } from "./types";

export interface RecipeComponentInput {
  kind: "ingredient" | "recipe";
  ingredientId: string | null;
  componentRecipeId: string | null;
  amount: number;
  bringOffsite: boolean;
}

export interface RecipeInput {
  name: string;
  type: KLRecipeType;
  /** Total grams the recipe yields. */
  totalGrams?: number | null;
  /** Number of portions it yields (from the portion size, or typed directly). */
  portions?: number | null;
  /** Sold in the shop: shows the pricing calculator. */
  soldInStore?: boolean;
  saleVariants?: KLSaleVariant[];
  components: RecipeComponentInput[];
  prepSteps: KLPrepStep[];
  prepEquipment: KLEquipRef[];
  eventEquipment: KLEquipRef[];
  bringItems: KLBringNote[];
  bringOffsite: boolean;
}

/** Drops blank free-text entries and trims the rest. */
function cleanBringItems(items: KLBringNote[] | undefined): KLBringNote[] {
  return (items ?? [])
    .map((i) => ({ id: i.id, text: String(i.text ?? "").trim() }))
    .filter((i) => i.text.length > 0);
}

function validate(input: RecipeInput): string | null {
  if (!input.name.trim()) return "שם חסר";
  if (input.totalGrams != null && !(input.totalGrams > 0)) return "כמות הגרמים חייבת להיות גדולה מ-0";
  if (input.portions != null && !(input.portions > 0)) return "כמות המנות חייבת להיות גדולה מ-0";
  for (const c of input.components) {
    if (!(c.amount > 0)) return "כמות רכיב חייבת להיות גדולה מ-0";
    if (c.kind === "ingredient" && !c.ingredientId) return "רכיב חסר בחירת מרכיב";
    if (c.kind === "recipe" && !c.componentRecipeId) return "רכיב חסר בחירת מתכון";
  }
  return null;
}

async function replaceComponents(recipeId: string, components: RecipeComponentInput[]): Promise<void> {
  const db = supabaseAdmin();
  await db.from("kl_recipe_components").delete().eq("recipe_id", recipeId);
  if (components.length === 0) return;

  const rows = components.map((c, i) => ({
    recipe_id: recipeId,
    kind: c.kind,
    ingredient_id: c.kind === "ingredient" ? c.ingredientId : null,
    component_recipe_id: c.kind === "recipe" ? c.componentRecipeId : null,
    amount: c.amount,
    sort_order: i,
    bring_offsite: c.bringOffsite !== false,
  }));
  const { error } = await db.from("kl_recipe_components").insert(rows);
  if (error) throw new Error(error.message);
}

export async function createRecipe(input: RecipeInput): Promise<{ id: string } | { error: string }> {
  const validationError = validate(input);
  if (validationError) return { error: validationError };

  const recipes = await getRecipes();
  const recipesById = new Map(recipes.map((r) => [r.id, r]));
  const proposedChildIds = input.components
    .filter((c) => c.kind === "recipe" && c.componentRecipeId)
    .map((c) => c.componentRecipeId as string);
  // A brand-new recipe has no existing id yet, so it can't already be
  // reachable from anything — only need to check for duplicate self-refs,
  // which proposedChildIds can't contain since this id doesn't exist yet.
  for (const childId of proposedChildIds) {
    if (!recipesById.has(childId)) return { error: "מתכון-רכיב לא נמצא" };
  }

  const base = deriveBase(input.totalGrams ?? null, input.portions ?? null);
  if (!base) return { error: "נא להזין כמה גרם יוצא מהמתכון (או כמה מנות)" };

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("kl_recipes")
    .insert({
      name: input.name.trim(),
      type: input.type,
      base_amount: base.amount,
      base_unit: base.unit,
      total_grams: input.totalGrams && input.totalGrams > 0 ? input.totalGrams : null,
      sold_in_store: input.soldInStore === true,
      sale_variants: cleanSaleVariants(input.saleVariants),
      prep_steps: input.prepSteps,
      prep_equipment: input.prepEquipment,
      event_equipment: input.eventEquipment,
      bring_items: cleanBringItems(input.bringItems),
      bring_offsite: input.bringOffsite !== false,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "יצירת המתכון נכשלה" };

  await replaceComponents(data.id, input.components);
  return { id: data.id };
}

export async function updateRecipe(recipeId: string, input: RecipeInput): Promise<{ ok: true } | { error: string }> {
  const validationError = validate(input);
  if (validationError) return { error: validationError };

  const recipes = await getRecipes();
  const recipesById = new Map(recipes.map((r) => [r.id, r]));
  const proposedChildIds = input.components
    .filter((c) => c.kind === "recipe" && c.componentRecipeId)
    .map((c) => c.componentRecipeId as string);

  if (wouldCreateCycle(recipeId, proposedChildIds, recipesById)) {
    return { error: "השינוי הזה היה יוצר מעגליות (מתכון שמכיל את עצמו, ישירות או דרך שרשרת)" };
  }

  // Neither grams nor portions entered: a recipe still on an old unit ("מיכלים", "תבנית"...) keeps it.
  const existing = recipesById.get(recipeId);
  const base = deriveBase(input.totalGrams ?? null, input.portions ?? null) ?? (existing ? { amount: existing.baseAmount, unit: existing.baseUnit } : null);
  if (!base) return { error: "נא להזין כמה גרם יוצא מהמתכון (או כמה מנות)" };

  const db = supabaseAdmin();

  // The unit changed (e.g. 2 "מיכלים" -> 1200 "גרם"). The recipe still yields the same food, so every amount
  // that was written in the old unit (recipes using this one, event menus) is converted, and no cost changes.
  if (existing && existing.baseUnit.trim() !== base.unit.trim() && existing.baseAmount > 0) {
    const ratio = base.amount / existing.baseAmount;
    const round3 = (n: number) => Math.max(0.001, Math.round(n * 1000) / 1000);
    const [{ data: uses }, { data: menus }] = await Promise.all([
      db.from("kl_recipe_components").select("id, amount").eq("component_recipe_id", recipeId),
      db.from("kl_event_menu").select("id, servings").eq("recipe_id", recipeId),
    ]);
    for (const u of uses ?? []) {
      const { error: e } = await db.from("kl_recipe_components").update({ amount: round3(Number(u.amount) * ratio) }).eq("id", u.id);
      if (e) return { error: e.message };
    }
    for (const m of menus ?? []) {
      const { error: e } = await db.from("kl_event_menu").update({ servings: round3(Number(m.servings) * ratio) }).eq("id", m.id);
      if (e) return { error: e.message };
    }
  }

  const { error } = await db
    .from("kl_recipes")
    .update({
      name: input.name.trim(),
      type: input.type,
      base_amount: base.amount,
      base_unit: base.unit,
      total_grams: input.totalGrams && input.totalGrams > 0 ? input.totalGrams : null,
      sold_in_store: input.soldInStore === true,
      sale_variants: cleanSaleVariants(input.saleVariants),
      prep_steps: input.prepSteps,
      prep_equipment: input.prepEquipment,
      event_equipment: input.eventEquipment,
      bring_items: cleanBringItems(input.bringItems),
      bring_offsite: input.bringOffsite !== false,
    })
    .eq("id", recipeId);
  if (error) return { error: error.message };

  await replaceComponents(recipeId, input.components);
  return { ok: true };
}

export async function deleteRecipe(recipeId: string): Promise<void> {
  const db = supabaseAdmin();
  // kl_recipe_components rows referencing this recipe (either as the owner
  // or as a nested component_recipe_id) cascade automatically.
  await db.from("kl_recipes").delete().eq("id", recipeId);
}
