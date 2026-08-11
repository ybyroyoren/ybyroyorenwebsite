import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getRecipes } from "./data";
import { wouldCreateCycle } from "./algorithms";
import type { KLEquipRef, KLPrepStep, KLRecipeType } from "./types";

export interface RecipeComponentInput {
  kind: "ingredient" | "recipe";
  ingredientId: string | null;
  componentRecipeId: string | null;
  amount: number;
}

export interface RecipeInput {
  name: string;
  type: KLRecipeType;
  baseAmount: number;
  baseUnit: string;
  components: RecipeComponentInput[];
  prepSteps: KLPrepStep[];
  prepEquipment: KLEquipRef[];
  eventEquipment: KLEquipRef[];
}

function validate(input: RecipeInput): string | null {
  if (!input.name.trim()) return "שם חסר";
  if (!input.baseUnit.trim()) return "יחידת בסיס חסרה";
  if (!(input.baseAmount > 0)) return "כמות בסיס חייבת להיות גדולה מ-0";
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

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("kl_recipes")
    .insert({
      name: input.name.trim(),
      type: input.type,
      base_amount: input.baseAmount,
      base_unit: input.baseUnit.trim(),
      prep_steps: input.prepSteps,
      prep_equipment: input.prepEquipment,
      event_equipment: input.eventEquipment,
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

  const db = supabaseAdmin();
  const { error } = await db
    .from("kl_recipes")
    .update({
      name: input.name.trim(),
      type: input.type,
      base_amount: input.baseAmount,
      base_unit: input.baseUnit.trim(),
      prep_steps: input.prepSteps,
      prep_equipment: input.prepEquipment,
      event_equipment: input.eventEquipment,
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
