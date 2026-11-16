"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { logAdminEvent } from "@/lib/audit";
import { expireSettings } from "@/lib/cache";
import { fetchMinOrderFresh, saveMinOrder } from "@/lib/siteSettings";

/** Sets the shop's minimum order (shekels, VAT included). 0 or empty = no minimum. */
export async function setMinOrder(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;

  const raw = String(formData.get("minOrder") ?? "").trim();
  const amount = raw === "" ? 0 : Number(raw);
  if (!Number.isFinite(amount) || amount < 0 || amount > 100000) redirect("/admin/products?error=minorder");
  const rounded = Math.round(amount * 100) / 100;

  const before = await fetchMinOrderFresh();
  const { error } = await saveMinOrder(rounded);
  if (error) redirect("/admin/products?error=minorder");

  await logAdminEvent("update", {
    entityType: "shop_settings",
    entityLabel: "מינימום הזמנה בחנות",
    changes: { min_order: [before, rounded] },
  });
  expireSettings();
  revalidatePath("/admin/products");
  revalidatePath("/checkout");
  revalidatePath("/en/checkout");
  redirect("/admin/products?saved=minorder");
}
