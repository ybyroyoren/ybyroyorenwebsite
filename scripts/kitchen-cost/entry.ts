// Bundled and run by snapshot.mjs. Computes, with the site's own code path
// (lib/kitchen/data.ts + algorithms.ts), every ingredient price and every recipe / event cost.
import { getEvents, getKitchenGraph } from "@/lib/kitchen/data";
import { eventCostBreakdown, ingredientLineCost, recipeBaseCost, recipeCostPerBaseUnit, recipeHasMissingPrices } from "@/lib/kitchen/algorithms";

export async function buildSnapshot() {
  const { recipesById, ingredientsById } = await getKitchenGraph();
  const events = await getEvents();

  const ingredients = [...ingredientsById.values()].map((i) => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
    price: i.price, // the per-unit price the cost engine uses
    yieldPercent: i.yieldPercent,
    purchaseName: i.purchaseName,
    purchaseUnit: i.purchaseUnit,
    supplierId: i.supplierId,
  }));

  const recipes = [...recipesById.values()].map((r) => ({
    id: r.id,
    name: r.name,
    baseAmount: r.baseAmount,
    baseUnit: r.baseUnit,
    baseCost: recipeBaseCost(r.id, recipesById, ingredientsById),
    costPerBaseUnit: recipeCostPerBaseUnit(r.id, recipesById, ingredientsById),
    partial: recipeHasMissingPrices(r.id, recipesById, ingredientsById),
    lines: r.components.map((c) => {
      const ing = c.ingredientId ? ingredientsById.get(c.ingredientId) : undefined;
      return {
        componentId: c.id,
        kind: c.kind,
        ref: c.ingredientId ?? c.componentRecipeId,
        name: ing?.name ?? recipesById.get(c.componentRecipeId ?? "")?.name ?? null,
        amount: c.amount,
        lineCost: ing ? ingredientLineCost(ing, c.amount) : null,
      };
    }),
  }));

  const eventRows = events.map((e) => {
    const cost = eventCostBreakdown(e.menu, recipesById, ingredientsById);
    return {
      id: e.id,
      name: e.name,
      date: e.date,
      guestCount: e.guestCount,
      total: cost.total,
      lines: cost.lines.map((l) => ({ recipeId: l.recipeId, servings: l.servings, cost: l.cost })),
    };
  });

  return {
    counts: {
      ingredients: ingredients.length,
      ingredientsWithPrice: ingredients.filter((i) => i.price !== null).length,
      recipes: recipes.length,
      recipesPartial: recipes.filter((r) => r.partial).length,
      events: eventRows.length,
    },
    ingredients,
    recipes,
    events: eventRows,
  };
}
