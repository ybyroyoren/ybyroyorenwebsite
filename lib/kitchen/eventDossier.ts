// Shared (server + client) definition of an event file ("תיק אירוע"): option lists, labels, defaults,
// the row <-> object mapping and the price maths. No server-only imports, so the editor can use it too.

export type DealStatus = "open" | "closed";

export const DEAL_STATUS_LABEL: Record<DealStatus, string> = {
  open: "עדיין לא סגור",
  closed: "סגור",
};

export const CATEGORIES: { value: string; label: string }[] = [
  { value: "company", label: "אירוע חברה" },
  { value: "family", label: "משפחתי" },
  { value: "open", label: "פתוח" },
  { value: "friends", label: "חברים" },
  { value: "wedding", label: "חתונה" },
  { value: "birthday", label: "יום הולדת" },
  { value: "other", label: "אחר" },
];

export const SERVICE_STYLES: { value: string; label: string }[] = [
  { value: "plated", label: "ישיבה מסביב לשולחן — הגשה אישית" },
  { value: "family", label: "ישיבה מסביב לשולחן — הגשה למרכז השולחן" },
  { value: "buffet", label: "שולחן בופה" },
  { value: "stations", label: "הגשה מעמדות הגשה" },
  { value: "other", label: "אחר" },
];

export const KITCHEN_FACILITIES: { value: string; label: string }[] = [
  { value: "oven", label: "תנור" },
  { value: "stove", label: "כיריים" },
  { value: "fridge", label: "מקרר" },
  { value: "freezer", label: "מקפיא" },
  { value: "dishwasher", label: "מדיח כלים" },
  { value: "sink", label: "כיור" },
  { value: "worktop", label: "משטח עבודה" },
  { value: "hot_cabinet", label: "ארון חימום" },
  { value: "outlets", label: "שקעי חשמל מספיקים" },
  { value: "gas", label: "גז" },
  { value: "none", label: "אין מטבח" },
];

export const RESTRICTION_TAGS: { value: string; label: string }[] = [
  { value: "vegetarian", label: "צמחוני" },
  { value: "vegan", label: "טבעוני" },
  { value: "gluten_free", label: "ללא גלוטן" },
  { value: "lactose_free", label: "ללא לקטוז" },
  { value: "nut_allergy", label: "אלרגיה לאגוזים" },
  { value: "peanut_allergy", label: "אלרגיה לבוטנים" },
  { value: "sesame_allergy", label: "אלרגיה לשומשום" },
  { value: "egg_allergy", label: "אלרגיה לביצים" },
  { value: "shellfish", label: "ללא פירות ים" },
  { value: "pork", label: "ללא חזיר" },
  { value: "kosher", label: "כשרות" },
  { value: "halal", label: "חלאל" },
];

export const STAFF_ROLES: { value: string; label: string }[] = [
  { value: "manager", label: "מנהל/ת" },
  { value: "cook", label: "טבח/ית" },
  { value: "waiter", label: "מלצר/ית" },
  { value: "bartender", label: "ברמן/ית" },
  { value: "other", label: "אחר" },
];

export interface DinerRestriction {
  name: string;
  restriction: string;
}
export interface PriceExtra {
  label: string;
  amount: number;
}
export interface StaffMember {
  name: string;
  role: string;
}
export interface DossierTask {
  text: string;
  done: boolean;
}

export interface KLEventDossier {
  dealStatus: DealStatus;
  gatherTime: string;
  startTime: string;
  endTime: string;
  category: string;
  categoryOther: string;
  serviceStyle: string;
  kidsCount: number;
  portionsCount: number | null;
  venueName: string;
  venueAccess: string;
  venueNotes: string;
  kitchenHas: string[];
  kitchenNotes: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  siteContactName: string;
  siteContactPhone: string;
  generalRestrictionTags: string[];
  generalRestrictions: string;
  dinerRestrictions: DinerRestriction[];
  specialEquipment: string;
  rentalNeeded: boolean;
  rentalNotes: string;
  bringServingWare: boolean;
  servingWareNotes: string;
  menuBuilt: boolean;
  menuSent: boolean;
  menuApproved: boolean;
  menuNotes: string;
  pricePerDiner: number | null;
  priceExtras: PriceExtra[];
  discount: number;
  discountNote: string;
  quoteSent: boolean;
  contractSigned: boolean;
  depositAmount: number | null;
  depositPaid: boolean;
  fullyPaid: boolean;
  needManagers: number;
  needCooks: number;
  needWaiters: number;
  staff: StaffMember[];
  drinksByUs: boolean;
  drinksNotes: string;
  alcohol: boolean;
  alcoholNotes: string;
  ice: boolean;
  iceNotes: string;
  tasks: DossierTask[];
  inquiryId: string | null;
}

/** What a brand-new file starts as. A new file is "not closed yet" until the deal is confirmed. */
export function emptyDossier(): KLEventDossier {
  return {
    dealStatus: "open",
    gatherTime: "",
    startTime: "",
    endTime: "",
    category: "",
    categoryOther: "",
    serviceStyle: "",
    kidsCount: 0,
    portionsCount: null,
    venueName: "",
    venueAccess: "",
    venueNotes: "",
    kitchenHas: [],
    kitchenNotes: "",
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    siteContactName: "",
    siteContactPhone: "",
    generalRestrictionTags: [],
    generalRestrictions: "",
    dinerRestrictions: [],
    specialEquipment: "",
    rentalNeeded: false,
    rentalNotes: "",
    bringServingWare: false,
    servingWareNotes: "",
    menuBuilt: false,
    menuSent: false,
    menuApproved: false,
    menuNotes: "",
    pricePerDiner: null,
    priceExtras: [],
    discount: 0,
    discountNote: "",
    quoteSent: false,
    contractSigned: false,
    depositAmount: null,
    depositPaid: false,
    fullyPaid: false,
    needManagers: 0,
    needCooks: 0,
    needWaiters: 0,
    staff: [],
    drinksByUs: false,
    drinksNotes: "",
    alcohol: false,
    alcoholNotes: "",
    ice: false,
    iceNotes: "",
    tasks: [],
    inquiryId: null,
  };
}

const num = (v: unknown): number | null => (v === null || v === undefined || v === "" ? null : Number(v));
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** DB row (snake_case, `select("*")`) → dossier object. */
export function dossierFromRow(r: Record<string, unknown>): KLEventDossier {
  const d = emptyDossier();
  const s = (k: string, fallback = "") => (typeof r[k] === "string" ? (r[k] as string) : fallback);
  const b = (k: string) => r[k] === true;
  return {
    ...d,
    dealStatus: r.deal_status === "open" ? "open" : "closed",
    gatherTime: s("gather_time"),
    startTime: s("start_time"),
    endTime: s("end_time"),
    category: s("category"),
    categoryOther: s("category_other"),
    serviceStyle: s("service_style"),
    kidsCount: Number(r.kids_count ?? 0),
    portionsCount: num(r.portions_count),
    venueName: s("venue_name"),
    venueAccess: s("venue_access"),
    venueNotes: s("venue_notes"),
    kitchenHas: arr<string>(r.kitchen_has),
    kitchenNotes: s("kitchen_notes"),
    clientName: s("client_name"),
    clientPhone: s("client_phone"),
    clientEmail: s("client_email"),
    siteContactName: s("site_contact_name"),
    siteContactPhone: s("site_contact_phone"),
    generalRestrictionTags: arr<string>(r.general_restriction_tags),
    generalRestrictions: s("general_restrictions"),
    dinerRestrictions: arr<DinerRestriction>(r.diner_restrictions),
    specialEquipment: s("special_equipment"),
    rentalNeeded: b("rental_needed"),
    rentalNotes: s("rental_notes"),
    bringServingWare: b("bring_serving_ware"),
    servingWareNotes: s("serving_ware_notes"),
    menuBuilt: b("menu_built"),
    menuSent: b("menu_sent"),
    menuApproved: b("menu_approved"),
    menuNotes: s("menu_notes"),
    pricePerDiner: num(r.price_per_diner),
    priceExtras: arr<PriceExtra>(r.price_extras).map((e) => ({ label: String(e.label ?? ""), amount: Number(e.amount ?? 0) })),
    discount: Number(r.discount ?? 0),
    discountNote: s("discount_note"),
    quoteSent: b("quote_sent"),
    contractSigned: b("contract_signed"),
    depositAmount: num(r.deposit_amount),
    depositPaid: b("deposit_paid"),
    fullyPaid: b("fully_paid"),
    needManagers: Number(r.need_managers ?? 0),
    needCooks: Number(r.need_cooks ?? 0),
    needWaiters: Number(r.need_waiters ?? 0),
    staff: arr<StaffMember>(r.staff),
    drinksByUs: b("drinks_by_us"),
    drinksNotes: s("drinks_notes"),
    alcohol: b("alcohol"),
    alcoholNotes: s("alcohol_notes"),
    ice: b("ice"),
    iceNotes: s("ice_notes"),
    tasks: arr<DossierTask>(r.tasks),
    inquiryId: typeof r.inquiry_id === "string" ? r.inquiry_id : null,
  };
}

const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const nonNeg = (v: unknown) => Math.max(0, Math.trunc(Number(v) || 0));
const money = (v: unknown): number | null => {
  const n = num(v);
  return n === null || !Number.isFinite(n) || n < 0 ? null : Math.round(n * 100) / 100;
};

/** Dossier object (from the client; untrusted) → DB columns. */
export function dossierToRow(d: Partial<KLEventDossier>): Record<string, unknown> {
  const base = emptyDossier();
  const x = { ...base, ...d };
  return {
    deal_status: x.dealStatus === "closed" ? "closed" : "open",
    gather_time: clean(x.gatherTime),
    start_time: clean(x.startTime),
    end_time: clean(x.endTime),
    category: clean(x.category),
    category_other: clean(x.categoryOther),
    service_style: clean(x.serviceStyle),
    kids_count: nonNeg(x.kidsCount),
    portions_count: x.portionsCount === null || x.portionsCount === undefined ? null : nonNeg(x.portionsCount),
    venue_name: clean(x.venueName),
    venue_access: clean(x.venueAccess),
    venue_notes: clean(x.venueNotes),
    kitchen_has: arr<string>(x.kitchenHas).map(String),
    kitchen_notes: clean(x.kitchenNotes),
    client_name: clean(x.clientName),
    client_phone: clean(x.clientPhone),
    client_email: clean(x.clientEmail),
    site_contact_name: clean(x.siteContactName),
    site_contact_phone: clean(x.siteContactPhone),
    general_restriction_tags: arr<string>(x.generalRestrictionTags).map(String),
    general_restrictions: clean(x.generalRestrictions),
    diner_restrictions: arr<DinerRestriction>(x.dinerRestrictions)
      .map((r) => ({ name: clean(r.name), restriction: clean(r.restriction) }))
      .filter((r) => r.name || r.restriction),
    special_equipment: clean(x.specialEquipment),
    rental_needed: !!x.rentalNeeded,
    rental_notes: clean(x.rentalNotes),
    bring_serving_ware: !!x.bringServingWare,
    serving_ware_notes: clean(x.servingWareNotes),
    menu_built: !!x.menuBuilt,
    menu_sent: !!x.menuSent,
    menu_approved: !!x.menuApproved,
    menu_notes: clean(x.menuNotes),
    price_per_diner: money(x.pricePerDiner),
    price_extras: arr<PriceExtra>(x.priceExtras)
      .map((e) => ({ label: clean(e.label), amount: Math.round((Number(e.amount) || 0) * 100) / 100 }))
      .filter((e) => e.label || e.amount),
    discount: money(x.discount) ?? 0,
    discount_note: clean(x.discountNote),
    quote_sent: !!x.quoteSent,
    contract_signed: !!x.contractSigned,
    deposit_amount: money(x.depositAmount),
    deposit_paid: !!x.depositPaid,
    fully_paid: !!x.fullyPaid,
    need_managers: nonNeg(x.needManagers),
    need_cooks: nonNeg(x.needCooks),
    need_waiters: nonNeg(x.needWaiters),
    staff: arr<StaffMember>(x.staff)
      .map((m) => ({ name: clean(m.name), role: clean(m.role) || "other" }))
      .filter((m) => m.name),
    drinks_by_us: !!x.drinksByUs,
    drinks_notes: clean(x.drinksNotes),
    alcohol: !!x.alcohol,
    alcohol_notes: clean(x.alcoholNotes),
    ice: !!x.ice,
    ice_notes: clean(x.iceNotes),
    tasks: arr<DossierTask>(x.tasks)
      .map((t) => ({ text: clean(t.text), done: !!t.done }))
      .filter((t) => t.text),
    inquiry_id: typeof x.inquiryId === "string" && x.inquiryId ? x.inquiryId : null,
  };
}

/** Price of the event as entered: diners x price per diner + extras - discount (never below zero). */
export function dossierTotal(d: Pick<KLEventDossier, "pricePerDiner" | "priceExtras" | "discount">, guestCount: number) {
  const base = (d.pricePerDiner ?? 0) * Math.max(0, guestCount);
  const extras = d.priceExtras.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const total = Math.max(0, base + extras - (d.discount || 0));
  return { base, extras, discount: d.discount || 0, total };
}

/** Staff still missing, by role, against what the event needs. */
export function staffGaps(d: Pick<KLEventDossier, "needManagers" | "needCooks" | "needWaiters" | "staff">) {
  const have = (role: string) => d.staff.filter((m) => m.role === role).length;
  return {
    managers: Math.max(0, d.needManagers - have("manager")),
    cooks: Math.max(0, d.needCooks - have("cook")),
    waiters: Math.max(0, d.needWaiters - have("waiter")),
  };
}

export const categoryLabel = (value: string, other = "") =>
  value === "other" && other ? other : CATEGORIES.find((c) => c.value === value)?.label ?? "";
export const serviceStyleLabel = (value: string) => SERVICE_STYLES.find((s) => s.value === value)?.label ?? "";
