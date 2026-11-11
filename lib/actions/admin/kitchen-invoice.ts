"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getInvoiceItems, getKitchenGraph } from "@/lib/kitchen/data";
import {
  formWarnings,
  previewCostChange,
  priceOutlierIds,
  outlierWarning,
  type CostPreview,
  type ProposedChange,
} from "@/lib/kitchen/invoicePricing";

const BASE = "/admin/kitchen";

function refresh() {
  revalidatePath(`${BASE}/ingredients`);
  revalidatePath(`${BASE}/recipes`);
  revalidatePath(`${BASE}/events`);
}

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

function optionalNumber(fd: FormData, key: string): number | null {
  const raw = text(fd, key).replace(",", ".");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function yieldValue(fd: FormData): number | null {
  const y = optionalNumber(fd, "yieldPercent");
  return y !== null && y > 0 && y <= 100 ? y : null;
}

function unitsValue(fd: FormData): number {
  const n = optionalNumber(fd, "unitsPerPurchaseUnit");
  return n !== null && n > 0 ? n : 1;
}

async function owner() {
  const admin = await requireAdmin();
  return admin.role === "owner" ? admin : null;
}

function itemFields(fd: FormData) {
  return {
    name: text(fd, "itemName"),
    supplier_id: text(fd, "supplierId") || null,
    purchase_unit: text(fd, "purchaseUnit"),
    price_net: optionalNumber(fd, "priceNet"),
    vat_rate: optionalNumber(fd, "vatRate") ?? 18,
    invoice_date: text(fd, "invoiceDate") || null,
    invoice_no: text(fd, "invoiceNo"),
    note: text(fd, "itemNote"),
  };
}

// ---------- create ----------

/** A new invoice item together with its first form (the ingredient recipes use). */
export async function createInvoiceItem(formData: FormData): Promise<void> {
  if (!(await owner())) return;
  const fields = itemFields(formData);
  const unit = text(formData, "formUnit");
  if (!fields.name || !fields.purchase_unit || !unit) return;

  const db = supabaseAdmin();
  const { data: item, error } = await db.from("kl_invoice_items").insert(fields).select("id").single();
  if (error || !item) return;

  const { error: formError } = await db.from("kl_ingredients").insert({
    name: text(formData, "formName") || fields.name,
    unit,
    invoice_item_id: item.id,
    units_per_purchase_unit: unitsValue(formData),
    yield_percent: yieldValue(formData),
  });
  if (formError) await db.from("kl_invoice_items").delete().eq("id", item.id);
  refresh();
}

/** Another form (peeled, sliced...) of an existing invoice item: same price, own amount and yield. */
export async function addForm(formData: FormData): Promise<void> {
  if (!(await owner())) return;
  const itemId = text(formData, "itemId");
  const name = text(formData, "formName");
  const unit = text(formData, "formUnit");
  if (!itemId || !name || !unit) return;
  await supabaseAdmin().from("kl_ingredients").insert({
    name,
    unit,
    invoice_item_id: itemId,
    units_per_purchase_unit: unitsValue(formData),
    yield_percent: yieldValue(formData),
  });
  refresh();
}

// ---------- update ----------

export async function updateInvoiceItem(formData: FormData): Promise<void> {
  if (!(await owner())) return;
  const id = text(formData, "itemId");
  const fields = itemFields(formData);
  if (!id || !fields.name || !fields.purchase_unit) return;
  await supabaseAdmin().from("kl_invoice_items").update(fields).eq("id", id);
  refresh();
}

export async function updateForm(formData: FormData): Promise<void> {
  if (!(await owner())) return;
  const id = text(formData, "ingredientId");
  const name = text(formData, "formName");
  const unit = text(formData, "formUnit");
  if (!id || !name || !unit) return;
  await supabaseAdmin()
    .from("kl_ingredients")
    .update({
      name,
      unit,
      units_per_purchase_unit: unitsValue(formData),
      yield_percent: yieldValue(formData),
      // Names used on shopping lists only (kept from the old model).
      purchase_name: text(formData, "purchaseName"),
      purchase_unit: text(formData, "listUnit"),
    })
    .eq("id", id);
  refresh();
}

/** Single-form items are edited as one: invoice fields and the form together. */
export async function updateItemAndForm(formData: FormData): Promise<void> {
  if (!(await owner())) return;
  await updateInvoiceItem(formData);
  await updateForm(formData);
}

// ---------- merge / delete ----------

/** Manual merge: this ingredient becomes a form of another invoice item (and takes its price). */
export async function moveFormToItem(formData: FormData): Promise<void> {
  if (!(await owner())) return;
  const ingredientId = text(formData, "ingredientId");
  const targetItemId = text(formData, "targetItemId");
  if (!ingredientId || !targetItemId) return;
  const db = supabaseAdmin();
  const { data: ingredient } = await db.from("kl_ingredients").select("invoice_item_id").eq("id", ingredientId).maybeSingle();
  if (!ingredient || ingredient.invoice_item_id === targetItemId) return;
  const oldItemId = ingredient.invoice_item_id as string | null;

  await db
    .from("kl_ingredients")
    .update({ invoice_item_id: targetItemId, units_per_purchase_unit: unitsValue(formData) })
    .eq("id", ingredientId);
  if (oldItemId) await removeItemIfEmpty(oldItemId);
  refresh();
}

async function removeItemIfEmpty(itemId: string) {
  const db = supabaseAdmin();
  const { count } = await db.from("kl_ingredients").select("id", { count: "exact", head: true }).eq("invoice_item_id", itemId);
  if ((count ?? 0) === 0) await db.from("kl_invoice_items").delete().eq("id", itemId);
}

/** Deleting a form removes it from every recipe that uses it (as ingredient deletion always did). */
export async function deleteForm(formData: FormData): Promise<void> {
  if (!(await owner())) return;
  const id = text(formData, "ingredientId");
  if (!id) return;
  const db = supabaseAdmin();
  const { data: ingredient } = await db.from("kl_ingredients").select("invoice_item_id").eq("id", id).maybeSingle();
  await db.from("kl_ingredients").delete().eq("id", id);
  if (ingredient?.invoice_item_id) await removeItemIfEmpty(ingredient.invoice_item_id as string);
  refresh();
}

// ---------- preview (nothing is written) ----------

export interface PreviewResult {
  ok: boolean;
  preview: CostPreview | null;
  warnings: string[];
}

/** What would change if the posted values were saved: affected ingredients, recipe costs, and sanity warnings. */
export async function previewKitchenCostChange(formData: FormData): Promise<PreviewResult> {
  if (!(await owner())) return { ok: false, preview: null, warnings: [] };
  const mode = text(formData, "mode"); // combined | item | form | move | newForm
  const [{ recipesById, ingredientsById }, items] = await Promise.all([getKitchenGraph(), getInvoiceItems()]);
  const itemsById = new Map(items.map((i) => [i.id, i]));

  const change: ProposedChange = {};
  const warnings: string[] = [];

  const itemId = text(formData, "itemId");
  const ingredientId = text(formData, "ingredientId");

  if ((mode === "combined" || mode === "item") && itemId) {
    change.itemId = itemId;
    change.priceNet = optionalNumber(formData, "priceNet");
  }
  if (mode === "combined" || mode === "form") {
    if (ingredientId) {
      const existing = ingredientsById.get(ingredientId);
      change.forms = [{ ingredientId, unitsPerPurchaseUnit: unitsValue(formData), yieldPercent: yieldValue(formData) }];
      if (mode === "form" && existing?.invoiceItemId) change.itemId = undefined;
    }
  }
  if (mode === "move" && ingredientId) {
    const target = itemsById.get(text(formData, "targetItemId"));
    if (target) change.relink = { ingredientId, itemPriceNet: target.priceNet, unitsPerPurchaseUnit: unitsValue(formData) };
  }

  const preview = previewCostChange(change, itemsById, ingredientsById, recipesById);
  if (preview.bigPriceChange) {
    const b = preview.bigPriceChange;
    warnings.push(`המחיר משתנה ב-${Math.round(b.pct)}% (מ-${b.oldPrice} ל-${b.newPrice}). לוודא יחידה ומחיר מול החשבונית.`);
  }

  // Sanity warnings on the values as they would be saved.
  const unit = text(formData, "formUnit") || (ingredientId ? ingredientsById.get(ingredientId)?.unit ?? "" : "");
  const formName = text(formData, "formName") || (ingredientId ? ingredientsById.get(ingredientId)?.name ?? "" : "");
  const targetItem = mode === "move" ? itemsById.get(text(formData, "targetItemId")) : itemsById.get(itemId);
  if (targetItem && unit) {
    const proposedNet = change.priceNet !== undefined ? change.priceNet : targetItem.priceNet;
    const purchaseUnit = mode === "combined" || mode === "item" ? text(formData, "purchaseUnit") || targetItem.purchaseUnit : targetItem.purchaseUnit;
    warnings.push(...formWarnings({ purchaseUnit, priceNet: proposedNet }, { unit, unitsPerPurchaseUnit: unitsValue(formData), name: formName }));
    if (proposedNet !== null && (mode === "combined" || mode === "item")) {
      const others = items.map((i) => (i.id === targetItem.id ? { ...i, priceNet: proposedNet, purchaseUnit } : i));
      if (priceOutlierIds(others).has(targetItem.id)) warnings.push(outlierWarning({ ...targetItem, priceNet: proposedNet }));
    }
  }
  return { ok: true, preview, warnings };
}
