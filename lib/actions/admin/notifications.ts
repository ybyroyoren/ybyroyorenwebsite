"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function addNotificationRecipient(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return;

  await db.from("notification_recipients").insert({
    email,
    notify_shop_order: formData.get("notifyShopOrder") === "on",
    notify_event_inquiry: formData.get("notifyEventInquiry") === "on",
    notify_meal_registration: formData.get("notifyMealRegistration") === "on",
    notify_contact_message: formData.get("notifyContactMessage") === "on",
  });
  revalidatePath("/admin/notifications");
}

export async function updateNotificationRecipient(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db
    .from("notification_recipients")
    .update({
      notify_shop_order: formData.get("notifyShopOrder") === "on",
      notify_event_inquiry: formData.get("notifyEventInquiry") === "on",
      notify_meal_registration: formData.get("notifyMealRegistration") === "on",
      notify_contact_message: formData.get("notifyContactMessage") === "on",
    })
    .eq("id", id);
  revalidatePath("/admin/notifications");
}

export async function deleteNotificationRecipient(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.from("notification_recipients").delete().eq("id", id);
  revalidatePath("/admin/notifications");
}
