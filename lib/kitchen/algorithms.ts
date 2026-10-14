// Pure recursive algorithms over the recipe/ingredient graph. No DB access —
// callers fetch everything into lookup Maps first (the dataset is small
// enough for a single catering business to hold entirely in memory).
//
// Ported directly from reference/kitchen-ledger-spec.md §4 — see that
// document for the reasoning behind each function; keep this file's
// structure aligned with its section numbers (4.1–4.6) if you touch it.

import type { KLEquipment, KLIngredient, KLRecipe, KLSupplier } from "./types";

export type RecipeMap = Map<string, KLRecipe>;
export type IngredientMap = Map<string, KLIngredient>;
export type SupplierMap = Map<string, KLSupplier>;
export type EquipmentMap = Map<string, KLEquipment>;

export interface MenuLine {
  recipeId: string;
  servings: number;
}

// ---------- 3.1 purchase/yield ratio ----------

export function purchaseAmountForIngredient(ingredient: KLIngredient, netAmount: number): number {
  const yp = ingredient.yieldPercent;
  if (!yp || yp <= 0 || yp >= 100) return netAmount;
  return netAmount / (yp / 100);
}

// ---------- 4.2 shopping list aggregation ----------

export function aggregateIngredients(
  recipeId: string,
  factor: number,
  recipesById: RecipeMap,
  totals: Map<string, number> = new Map(),
  pathGuard: Set<string> = new Set()
): Map<string, number> {
  if (pathGuard.has(recipeId)) return totals; // cycle guard
  const recipe = recipesById.get(recipeId);
  if (!recipe) return totals;

  const nextGuard = new Set(pathGuard);
  nextGuard.add(recipeId);

  for (const comp of recipe.components) {
    if (comp.kind === "ingredient" && comp.ingredientId) {
      const amt = comp.amount * factor;
      totals.set(comp.ingredientId, (totals.get(comp.ingredientId) ?? 0) + amt);
    } else if (comp.kind === "recipe" && comp.componentRecipeId) {
      const child = recipesById.get(comp.componentRecipeId);
      if (!child) continue;
      const childFactor = (comp.amount * factor) / child.baseAmount;
      aggregateIngredients(comp.componentRecipeId, childFactor, recipesById, totals, nextGuard);
    }
  }
  return totals;
}

export function aggregateIngredientsForMenu(menu: MenuLine[], recipesById: RecipeMap): Map<string, number> {
  const totals = new Map<string, number>();
  for (const item of menu) {
    const recipe = recipesById.get(item.recipeId);
    if (!recipe) continue;
    const factor = item.servings / recipe.baseAmount;
    aggregateIngredients(item.recipeId, factor, recipesById, totals);
  }
  return totals;
}

export interface ShoppingListRow {
  ingredientId: string;
  displayName: string;
  displayUnit: string;
  purchaseAmount: number;
  netAmount: number;
}

export interface ShoppingListGroup {
  supplierId: string | null;
  supplierName: string;
  rows: ShoppingListRow[];
}

export function buildShoppingList(
  netTotals: Map<string, number>,
  ingredientsById: IngredientMap,
  suppliersById: SupplierMap
): ShoppingListGroup[] {
  const groups = new Map<string, ShoppingListGroup>();

  for (const [ingredientId, netAmount] of netTotals) {
    const ingredient = ingredientsById.get(ingredientId);
    if (!ingredient) continue;
    const purchaseAmount = purchaseAmountForIngredient(ingredient, netAmount);
    const supplierId = ingredient.supplierId;
    const key = supplierId ?? "__none__";

    if (!groups.has(key)) {
      groups.set(key, {
        supplierId,
        supplierName: supplierId ? (suppliersById.get(supplierId)?.name ?? "—") : "ללא ספק מוגדר",
        rows: [],
      });
    }
    groups.get(key)!.rows.push({
      ingredientId,
      displayName: ingredient.purchaseName || ingredient.name,
      displayUnit: ingredient.purchaseUnit || ingredient.unit,
      purchaseAmount,
      netAmount,
    });
  }

  const result = Array.from(groups.values());
  result.sort((a, b) => {
    if (a.supplierId === null) return 1;
    if (b.supplierId === null) return -1;
    return a.supplierName.localeCompare(b.supplierName, "he");
  });
  for (const g of result) g.rows.sort((a, b) => a.displayName.localeCompare(b.displayName, "he"));
  return result;
}

// ---------- 4.3 nested prep tree ----------

function aggregateRecipeUsage(
  recipeId: string,
  factor: number,
  recipesById: RecipeMap,
  usage: Map<string, number>,
  pathGuard: Set<string>
): void {
  if (pathGuard.has(recipeId)) return;
  const recipe = recipesById.get(recipeId);
  if (!recipe) return;

  const nextGuard = new Set(pathGuard);
  nextGuard.add(recipeId);

  for (const comp of recipe.components) {
    if (comp.kind === "recipe" && comp.componentRecipeId) {
      const child = recipesById.get(comp.componentRecipeId);
      if (!child) continue;
      const neededChildAmount = comp.amount * factor;
      usage.set(comp.componentRecipeId, (usage.get(comp.componentRecipeId) ?? 0) + neededChildAmount);
      const childFactor = neededChildAmount / child.baseAmount;
      aggregateRecipeUsage(comp.componentRecipeId, childFactor, recipesById, usage, nextGuard);
    }
  }
}

/** recipeId -> total amount (in that recipe's own baseUnit) needed across the whole menu. */
export function buildRecipeUsageMap(menu: MenuLine[], recipesById: RecipeMap): Map<string, number> {
  const usage = new Map<string, number>();
  for (const item of menu) {
    const recipe = recipesById.get(item.recipeId);
    if (!recipe) continue;
    usage.set(item.recipeId, (usage.get(item.recipeId) ?? 0) + item.servings);
    const factor = item.servings / recipe.baseAmount;
    aggregateRecipeUsage(item.recipeId, factor, recipesById, usage, new Set());
  }
  return usage;
}

export interface PrepTreeNode {
  recipeId: string;
  recipe: KLRecipe;
  totalAmount: number;
  /** Already rendered earlier in this forest — show a short "see above" reference instead of the full block. */
  isReference: boolean;
  children: PrepTreeNode[];
}

export function buildPrepForest(menu: MenuLine[], recipesById: RecipeMap): PrepTreeNode[] {
  const usage = buildRecipeUsageMap(menu, recipesById);
  const rendered = new Set<string>();

  function renderNode(recipeId: string): PrepTreeNode | null {
    const recipe = recipesById.get(recipeId);
    if (!recipe) return null;
    const totalAmount = usage.get(recipeId) ?? 0;

    if (rendered.has(recipeId)) {
      return { recipeId, recipe, totalAmount, isReference: true, children: [] };
    }
    rendered.add(recipeId);

    const children: PrepTreeNode[] = [];
    for (const comp of recipe.components) {
      if (comp.kind === "recipe" && comp.componentRecipeId) {
        const node = renderNode(comp.componentRecipeId);
        if (node) children.push(node);
      }
    }
    return { recipeId, recipe, totalAmount, isReference: false, children };
  }

  const forest: PrepTreeNode[] = [];
  for (const item of menu) {
    const node = renderNode(item.recipeId);
    if (node) forest.push(node);
  }
  return forest;
}

// ---------- 4.4 equipment aggregation (event-wide dedup) ----------

export function aggregateEventEquipment(menu: MenuLine[], recipesById: RecipeMap): Map<string, number> {
  const totals = new Map<string, number>();
  const visitedRecipes = new Set<string>();

  function visit(recipeId: string): void {
    if (visitedRecipes.has(recipeId)) return;
    visitedRecipes.add(recipeId);
    const recipe = recipesById.get(recipeId);
    if (!recipe) return;

    for (const eq of recipe.eventEquipment) {
      totals.set(eq.equipId, (totals.get(eq.equipId) ?? 0) + eq.qty);
    }
    for (const comp of recipe.components) {
      if (comp.kind === "recipe" && comp.componentRecipeId) {
        visit(comp.componentRecipeId);
      }
    }
  }

  for (const item of menu) visit(item.recipeId);
  return totals;
}

export interface EquipmentListRow {
  equipId: string;
  name: string;
  qty: number;
}

export function buildEquipmentList(menu: MenuLine[], recipesById: RecipeMap, equipmentById: EquipmentMap): EquipmentListRow[] {
  const totals = aggregateEventEquipment(menu, recipesById);
  const rows: EquipmentListRow[] = [];
  for (const [equipId, qty] of totals) {
    rows.push({ equipId, name: equipmentById.get(equipId)?.name ?? "—", qty });
  }
  rows.sort((a, b) => a.name.localeCompare(b.name, "he"));
  return rows;
}

// ---------- 4.5 recipe cost ----------

export function recipeCostAtFactor(
  recipeId: string,
  factor: number,
  recipesById: RecipeMap,
  ingredientsById: IngredientMap
): number {
  const totals = aggregateIngredients(recipeId, factor, recipesById);
  let cost = 0;
  for (const [ingredientId, netAmount] of totals) {
    const ingredient = ingredientsById.get(ingredientId);
    if (!ingredient || ingredient.price == null) continue;
    const purchaseAmt = purchaseAmountForIngredient(ingredient, netAmount);
    cost += purchaseAmt * ingredient.price;
  }
  return cost;
}

export function recipeBaseCost(recipeId: string, recipesById: RecipeMap, ingredientsById: IngredientMap): number {
  return recipeCostAtFactor(recipeId, 1, recipesById, ingredientsById);
}

export function recipeCostPerBaseUnit(
  recipeId: string,
  recipesById: RecipeMap,
  ingredientsById: IngredientMap
): number {
  const recipe = recipesById.get(recipeId);
  if (!recipe) return 0;
  return recipeBaseCost(recipeId, recipesById, ingredientsById) / recipe.baseAmount;
}

/**
 * Cost of `netAmount` of one ingredient, including the yield loss — the same
 * formula recipeCostAtFactor applies per ingredient, so the lines of a recipe
 * always add up to its cost. null when the ingredient has no price yet.
 */
export function ingredientLineCost(ingredient: KLIngredient, netAmount: number): number | null {
  if (ingredient.price == null) return null;
  return purchaseAmountForIngredient(ingredient, netAmount) * ingredient.price;
}

/** True when some raw ingredient anywhere under the recipe has no price, so its cost is understated. */
export function recipeHasMissingPrices(
  recipeId: string,
  recipesById: RecipeMap,
  ingredientsById: IngredientMap
): boolean {
  for (const ingredientId of aggregateIngredients(recipeId, 1, recipesById).keys()) {
    const ingredient = ingredientsById.get(ingredientId);
    if (!ingredient || ingredient.price == null) return true;
  }
  return false;
}

export interface EventCostLine {
  recipeId: string;
  servings: number;
  cost: number;
}

export interface EventCostBreakdown {
  lines: EventCostLine[];
  total: number;
}

export function eventCostBreakdown(
  menu: MenuLine[],
  recipesById: RecipeMap,
  ingredientsById: IngredientMap
): EventCostBreakdown {
  const lines = menu.map((item) => {
    const recipe = recipesById.get(item.recipeId);
    const factor = recipe ? item.servings / recipe.baseAmount : 0;
    const cost = recipeCostAtFactor(item.recipeId, factor, recipesById, ingredientsById);
    return { recipeId: item.recipeId, servings: item.servings, cost };
  });
  return { lines, total: lines.reduce((sum, l) => sum + l.cost, 0) };
}

// ---------- 4.6 bring items (offsite only) ----------
//
// What goes into the "items and preps to bring" list of an offsite event:
//   - every dish/prep on the menu that is ticked "bring itself" (e.g. the
//     cheesecake itself);
//   - each depth-1 component of those recipes that is ticked "bring to
//     offsite events" — raw ingredient or prep alike;
//   - the recipe's free-text bring items (e.g. "disposable cutlery").

export interface BringItem {
  key: string;
  kind: "dish" | "prep" | "ingredient" | "note";
  label: string;
  /** 0 for free-text notes, which have no amount. */
  amount: number;
  /** "" for free-text notes. */
  unit: string;
}

const BRING_KIND_ORDER: Record<BringItem["kind"], number> = { dish: 0, prep: 1, ingredient: 2, note: 3 };

export function buildBringItems(menu: MenuLine[], recipesById: RecipeMap, ingredientsById: IngredientMap): BringItem[] {
  const dishes = new Map<string, { recipe: KLRecipe; amount: number }>();
  const preps = new Map<string, { recipe: KLRecipe; amount: number }>();
  const raws = new Map<string, { ingredient: KLIngredient; amount: number }>();
  const notes = new Map<string, BringItem>();

  const addRecipe = (target: Map<string, { recipe: KLRecipe; amount: number }>, recipe: KLRecipe, amount: number) => {
    const existing = target.get(recipe.id);
    target.set(recipe.id, { recipe, amount: (existing?.amount ?? 0) + amount });
  };

  for (const item of menu) {
    const recipe = recipesById.get(item.recipeId);
    if (!recipe) continue;
    const factor = item.servings / recipe.baseAmount;

    // The menu item itself. A prep put straight on the menu merges with the
    // same prep appearing as a component elsewhere (same base unit).
    if (recipe.bringOffsite) addRecipe(recipe.type === "prep" ? preps : dishes, recipe, item.servings);

    for (const comp of recipe.components) {
      if (!comp.bringOffsite) continue;
      if (comp.kind === "recipe" && comp.componentRecipeId) {
        const child = recipesById.get(comp.componentRecipeId);
        if (child) addRecipe(preps, child, comp.amount * factor);
      } else if (comp.kind === "ingredient" && comp.ingredientId) {
        const ingredient = ingredientsById.get(comp.ingredientId);
        if (!ingredient) continue;
        const existing = raws.get(comp.ingredientId);
        raws.set(comp.ingredientId, { ingredient, amount: (existing?.amount ?? 0) + comp.amount * factor });
      }
    }

    for (const note of recipe.bringItems) {
      if (!note.text.trim()) continue;
      const key = `note:${recipe.id}:${note.id}`;
      notes.set(key, { key, kind: "note", label: note.text.trim(), amount: 0, unit: "" });
    }
  }

  const items: BringItem[] = [];
  for (const [id, { recipe, amount }] of dishes) {
    items.push({ key: `dish:${id}`, kind: "dish", label: recipe.name, amount, unit: recipe.baseUnit });
  }
  for (const [id, { recipe, amount }] of preps) {
    items.push({ key: `prep:${id}`, kind: "prep", label: recipe.name, amount, unit: recipe.baseUnit });
  }
  for (const [id, { ingredient, amount }] of raws) {
    items.push({ key: `ingredient:${id}`, kind: "ingredient", label: ingredient.name, amount, unit: ingredient.unit });
  }
  items.push(...notes.values());

  // Group by kind; alphabetical within a kind, except free-text notes which
  // keep the order they were written in.
  items.sort((a, b) => {
    if (a.kind !== b.kind) return BRING_KIND_ORDER[a.kind] - BRING_KIND_ORDER[b.kind];
    if (a.kind === "note") return 0;
    return a.label.localeCompare(b.label, "he");
  });
  return items;
}

// ---------- cycle prevention (recipe editor validation) ----------

function isReachable(fromId: string, targetId: string, recipesById: RecipeMap, visited: Set<string> = new Set()): boolean {
  if (fromId === targetId) return true;
  if (visited.has(fromId)) return false;
  visited.add(fromId);
  const recipe = recipesById.get(fromId);
  if (!recipe) return false;
  for (const comp of recipe.components) {
    if (comp.kind === "recipe" && comp.componentRecipeId) {
      if (isReachable(comp.componentRecipeId, targetId, recipesById, visited)) return true;
    }
  }
  return false;
}

/** True if adding `recipeId -> child` edges for any of `proposedChildIds` would create a cycle. */
export function wouldCreateCycle(recipeId: string, proposedChildIds: string[], recipesById: RecipeMap): boolean {
  for (const childId of proposedChildIds) {
    if (childId === recipeId) return true;
    if (isReachable(childId, recipeId, recipesById)) return true;
  }
  return false;
}
