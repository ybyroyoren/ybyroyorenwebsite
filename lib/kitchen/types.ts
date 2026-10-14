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
  /** Taken to offsite events (true even for a component that is itself a prep, if ticked). */
  bringOffsite: boolean;
}

/** A free-text extra to take to offsite events (not an ingredient or a recipe). */
export interface KLBringNote {
  id: string;
  text: string;
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
  bringItems: KLBringNote[];
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
