"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export async function addPickupRule(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;

  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const startDate = ISO.test(text("startDate")) ? text("startDate") : null;
  const endDate = ISO.test(text("endDate")) ? text("endDate") : null;
  const weekdays = formData
    .getAll("weekday")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  const productIds = formData.getAll("productId").map(String).filter(Boolean);

  if (!startDate && !endDate && weekdays.length === 0) redirect("/admin/pickup-rules?error=empty");
  if (startDate && endDate && startDate > endDate) redirect("/admin/pickup-rules?error=order");

  const { error } = await supabaseAdmin()
    .from("pickup_rules")
    .insert({
      name: text("name").slice(0, 80),
      start_date: startDate,
      end_date: endDate,
      weekdays: weekdays.length > 0 ? weekdays : null,
      product_ids: productIds.length > 0 ? productIds : null,
      message: text("message").slice(0, 300),
      message_en: text("messageEn").slice(0, 300),
      active: true,
    });
  if (error) redirect("/admin/pickup-rules?error=save");
  revalidatePath("/admin/pickup-rules");
  redirect("/admin/pickup-rules?saved=1");
}

export async function togglePickupRule(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabaseAdmin()
    .from("pickup_rules")
    .update({ active: formData.get("active") === "true" })
    .eq("id", id);
  revalidatePath("/admin/pickup-rules");
}

export async function deletePickupRule(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabaseAdmin().from("pickup_rules").delete().eq("id", id);
  revalidatePath("/admin/pickup-rules");
}
