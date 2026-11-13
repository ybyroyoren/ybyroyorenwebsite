"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/whatsapp";
import { sendAndLogWhatsApp } from "@/lib/notifications";

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

// ---------- WhatsApp ----------

export async function addWhatsAppRecipient(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;

  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  if (!phone) redirect("/admin/notifications?error=phone");

  const { error } = await supabaseAdmin()
    .from("whatsapp_recipients")
    .insert({
      name: String(formData.get("name") ?? "").trim().slice(0, 60),
      phone,
      notify_shop_order: formData.get("notifyShopOrder") === "on",
      notify_event_inquiry: formData.get("notifyEventInquiry") === "on",
      notify_meal_registration: formData.get("notifyMealRegistration") === "on",
      notify_contact_message: formData.get("notifyContactMessage") === "on",
    });
  if (error) redirect(`/admin/notifications?error=${error.code === "23505" ? "duplicate" : "save"}`);
  revalidatePath("/admin/notifications");
}

export async function updateWhatsAppRecipient(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabaseAdmin()
    .from("whatsapp_recipients")
    .update({
      notify_shop_order: formData.get("notifyShopOrder") === "on",
      notify_event_inquiry: formData.get("notifyEventInquiry") === "on",
      notify_meal_registration: formData.get("notifyMealRegistration") === "on",
      notify_contact_message: formData.get("notifyContactMessage") === "on",
    })
    .eq("id", id);
  revalidatePath("/admin/notifications");
}

export async function deleteWhatsAppRecipient(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabaseAdmin().from("whatsapp_recipients").delete().eq("id", id);
  revalidatePath("/admin/notifications");
}

/** Sends a test message to one number; the result shows up in the send log on the same page. */
export async function testWhatsAppRecipient(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { data } = await supabaseAdmin().from("whatsapp_recipients").select("phone").eq("id", id).single();
  if (data?.phone) {
    await sendAndLogWhatsApp("test", data.phone, {
      kind: "הודעת בדיקה",
      customer: "בדיקת מערכת",
      details: "אם הגיעה אליך ההודעה הזו, ההתראות בוואטסאפ עובדות",
    });
  }
  revalidatePath("/admin/notifications");
}
