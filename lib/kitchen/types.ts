export interface KLSupplier {
  id: string;
  name: string;
  note: string;
  phone: string;
  email: string;
}

export interface KLEquipment {
  id: string;
  name: string;
  note: string;
}

export interface KLGuest {
  id: string;
  name: string;
  phone: string;
  restrictions: string;
}

export interface KLIngredient {
  id: string;
  name: string;
  unit: string;
  supplierId: string | null;
  purchaseName: string;
  purchaseUnit: string;
  yieldPercent: number | null;
  price: number | null;
}

export type KLRecipeType = "dish" | "prep";

export interface KLPrepStep {
  id: string;
  text: string;
}

export interface KLEquipRef {
  equipId: string;
  qty: number;
}

export interface KLRecipeComponent {
  id: string;
  kind: "ingredient" | "recipe";
  ingredientId: string | null;
  componentRecipeId: string | null;
  amount: number;
  sortOrder: number;
}

export interface KLRecipe {
  id: string;
  name: string;
  type: KLRecipeType;
  baseAmount: number;
  baseUnit: string;
  prepSteps: KLPrepStep[];
  prepEquipment: KLEquipRef[];
  eventEquipment: KLEquipRef[];
  components: KLRecipeComponent[];
}

export interface KLEventMenuItem {
  id: string;
  recipeId: string;
  servings: number;
  sortOrder: number;
}

export interface KLEventGuestSeat {
  seatIndex: number;
  guestId: string | null;
}

export type KLEventType = "onsite" | "offsite";

export interface KLEvent {
  id: string;
  name: string;
  date: string | null;
  eventType: KLEventType;
  location: string;
  guestCount: number;
  notes: string;
  menu: KLEventMenuItem[];
  seats: KLEventGuestSeat[];
}
