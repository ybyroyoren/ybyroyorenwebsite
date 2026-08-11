import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import type {
  KLEquipment,
  KLEvent,
  KLGuest,
  KLIngredient,
  KLRecipe,
  KLSupplier,
} from "./types";
import type { EquipmentMap, IngredientMap, RecipeMap, SupplierMap } from "./algorithms";

export async function getSuppliers(): Promise<KLSupplier[]> {
  const db = supabaseAdmin();
  const { data } = await db.from("kl_suppliers").select("id, name, note, phone, email").order("name");
  return data ?? [];
}

export async function getEquipmentList(): Promise<KLEquipment[]> {
  const db = supabaseAdmin();
  const { data } = await db.from("kl_equipment").select("id, name, note").order("name");
  return data ?? [];
}

export async function getGuestsList(): Promise<KLGuest[]> {
  const db = supabaseAdmin();
  const { data } = await db.from("kl_guests").select("id, name, phone, restrictions").order("name");
  return data ?? [];
}

export async function getIngredients(): Promise<KLIngredient[]> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("kl_ingredients")
    .select("id, name, unit, supplier_id, purchase_name, purchase_unit, yield_percent, price")
    .order("name");
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    unit: row.unit,
    supplierId: row.supplier_id,
    purchaseName: row.purchase_name,
    purchaseUnit: row.purchase_unit,
    yieldPercent: row.yield_percent,
    price: row.price,
  }));
}

export async function getRecipes(): Promise<KLRecipe[]> {
  const db = supabaseAdmin();
  const { data: recipeRows } = await db
    .from("kl_recipes")
    .select("id, name, type, base_amount, base_unit, prep_steps, prep_equipment, event_equipment")
    .order("name");
  const { data: componentRows } = await db
    .from("kl_recipe_components")
    .select("id, recipe_id, kind, ingredient_id, component_recipe_id, amount, sort_order")
    .order("sort_order");

  const componentsByRecipe = new Map<string, KLRecipe["components"]>();
  for (const c of componentRows ?? []) {
    const list = componentsByRecipe.get(c.recipe_id) ?? [];
    list.push({
      id: c.id,
      kind: c.kind,
      ingredientId: c.ingredient_id,
      componentRecipeId: c.component_recipe_id,
      amount: c.amount,
      sortOrder: c.sort_order,
    });
    componentsByRecipe.set(c.recipe_id, list);
  }

  return (recipeRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    baseAmount: row.base_amount,
    baseUnit: row.base_unit,
    prepSteps: row.prep_steps ?? [],
    prepEquipment: row.prep_equipment ?? [],
    eventEquipment: row.event_equipment ?? [],
    components: componentsByRecipe.get(row.id) ?? [],
  }));
}

export async function getEvents(): Promise<KLEvent[]> {
  const db = supabaseAdmin();
  const { data: eventRows } = await db
    .from("kl_events")
    .select("id, name, date, event_type, location, guest_count, notes")
    .order("date", { ascending: false });
  const { data: menuRows } = await db
    .from("kl_event_menu")
    .select("id, event_id, recipe_id, servings, sort_order")
    .order("sort_order");
  const { data: seatRows } = await db
    .from("kl_event_guest_seats")
    .select("event_id, seat_index, guest_id")
    .order("seat_index");

  const menuByEvent = new Map<string, KLEvent["menu"]>();
  for (const m of menuRows ?? []) {
    const list = menuByEvent.get(m.event_id) ?? [];
    list.push({ id: m.id, recipeId: m.recipe_id, servings: m.servings, sortOrder: m.sort_order });
    menuByEvent.set(m.event_id, list);
  }

  const seatsByEvent = new Map<string, KLEvent["seats"]>();
  for (const s of seatRows ?? []) {
    const list = seatsByEvent.get(s.event_id) ?? [];
    list.push({ seatIndex: s.seat_index, guestId: s.guest_id });
    seatsByEvent.set(s.event_id, list);
  }

  return (eventRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    date: row.date,
    eventType: row.event_type,
    location: row.location,
    guestCount: row.guest_count,
    notes: row.notes,
    menu: menuByEvent.get(row.id) ?? [],
    seats: (seatsByEvent.get(row.id) ?? []).sort((a, b) => a.seatIndex - b.seatIndex),
  }));
}

export async function getEventById(id: string): Promise<KLEvent | null> {
  const events = await getEvents();
  return events.find((e) => e.id === id) ?? null;
}

export async function getCompletedItemKeys(eventId: string): Promise<Set<string>> {
  const db = supabaseAdmin();
  const { data } = await db.from("kl_event_completed_items").select("item_key").eq("event_id", eventId);
  return new Set((data ?? []).map((r) => r.item_key));
}

// ---------- convenience: everything needed for the algorithms, as Maps ----------

export interface KitchenGraph {
  recipesById: RecipeMap;
  ingredientsById: IngredientMap;
  suppliersById: SupplierMap;
  equipmentById: EquipmentMap;
}

export async function getKitchenGraph(): Promise<KitchenGraph> {
  const [recipes, ingredients, suppliers, equipment] = await Promise.all([
    getRecipes(),
    getIngredients(),
    getSuppliers(),
    getEquipmentList(),
  ]);
  return {
    recipesById: new Map(recipes.map((r) => [r.id, r])),
    ingredientsById: new Map(ingredients.map((i) => [i.id, i])),
    suppliersById: new Map(suppliers.map((s) => [s.id, s])),
    equipmentById: new Map(equipment.map((e) => [e.id, e])),
  };
}
