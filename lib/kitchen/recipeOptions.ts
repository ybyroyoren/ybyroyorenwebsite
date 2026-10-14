import type { KLIngredient, KLRecipe } from "./types";
import { recipeCostPerBaseUnit, recipeHasMissingPrices } from "./algorithms";
import type { RecipeOption } from "@/components/admin/kitchen/RecipeEditorForm";

/** Options for the "recipe as a component" dropdown, with the cost data the editor needs to price a line. */
export function buildRecipeOptions(recipes: KLRecipe[], ingredients: KLIngredient[]): RecipeOption[] {
  const recipesById = new Map(recipes.map((r) => [r.id, r]));
  const ingredientsById = new Map(ingredients.map((i) => [i.id, i]));
  return recipes.map((r) => ({
    id: r.id,
    name: r.name,
    baseAmount: r.baseAmount,
    baseUnit: r.baseUnit,
    costPerBaseUnit: recipeCostPerBaseUnit(r.id, recipesById, ingredientsById),
    pricesIncomplete: recipeHasMissingPrices(r.id, recipesById, ingredientsById),
  }));
}
