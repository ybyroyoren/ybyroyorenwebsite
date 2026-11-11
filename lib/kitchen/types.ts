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
  /** Price per `unit` (the cost engine's input). Computed by the database: invoice item price_net / unitsPerPurchaseUnit. */
  price: number | null;
  /** The invoice item this ingredient is a "form" of (null only for legacy rows being relinked). */
  invoiceItemId: string | null;
  /** How many `unit`s (g, ml, pieces) one purchase unit of the invoice item yields, before yield loss. */
  unitsPerPurchaseUnit: number;
}

/** One thing bought from a supplier, priced exactly as on the invoice (net, per purchase unit). */
export interface KLInvoiceItem {
  id: string;
  name: string;
  supplierId: string | null;
  purchaseUnit: string;
  priceNet: number | null;
  vatRate: number;
  invoiceDate: string | null;
  invoiceNo: string;
  note: string;
  priceUpdatedAt: string | null;
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
  /** The dish/prep itself is listed in an offsite event's bring list when on its menu. */
  bringOffsite: boolean;
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
  /** Set when the event was closed: costs are then frozen in `costSnapshot`. */
  closedAt: string | null;
  costSnapshot: KLEventCostSnapshot | null;
  menu: KLEventMenuItem[];
  seats: KLEventGuestSeat[];
}

/** Cost of an event as it was when the event was closed (later price changes don't touch it). */
export interface KLEventCostSnapshot {
  takenAt: string;
  total: number;
  lines: { recipeId: string; recipeName: string; servings: number; unit: string; cost: number }[];
  /** True when some ingredient had no price at that time (the total is understated). */
  partial: boolean;
}
