"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function cancelOrder(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.from("orders").update({ status: "cancelled" }).eq("id", id);
  revalidatePath("/admin/orders");
}

const FULFILLMENT_STATUSES = ["open", "prepared", "completed", "partially_fulfilled", "no_show"];

export async function updateOrderFulfillmentStatus(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!["owner", "kitchen"].includes(admin.role)) return;
  const db = supabaseAdmin();

  const id = String(formData.get("id") ?? "");
  const fulfillmentStatus = String(formData.get("fulfillmentStatus") ?? "");
  if (!id || !FULFILLMENT_STATUSES.includes(fulfillmentStatus)) return;

  await db.from("orders").update({ fulfillment_status: fulfillmentStatus }).eq("id", id);
  revalidatePath("/admin/orders");
}
