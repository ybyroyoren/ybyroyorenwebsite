"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { normalizePhone, toLocalIsraeli } from "@/lib/phone";
import { saveSettings } from "@/lib/integrationSettings";
import { logAdminEvent } from "@/lib/audit";
import { sendAndLogSms, sendAndLogWhatsApp } from "@/lib/notifications";

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

// ---------- SMS ----------

/** Saves the SMS4Free connection details. Empty fields are left as they were; secrets are never logged or shown back. */
export async function saveSmsSettings(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;

  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const asSender = (raw: string) => {
    // A phone number is stored the way Israeli SMS providers expect (0541234567); a sender name stays as typed.
    if (/^[\d\s\-+()]+$/.test(raw)) {
      const phone = normalizePhone(raw);
      return phone ? toLocalIsraeli(phone) : null;
    }
    return raw;
  };

  const values: Record<string, string> = {};
  const user = text("user");
  if (user) {
    const normalized = asSender(user);
    if (!normalized || !/^\d+$/.test(normalized)) redirect("/admin/notifications?error=smsuser");
    values.SMS4FREE_USER = normalized;
  }
  const sender = text("sender");
  if (sender) {
    const normalized = asSender(sender);
    if (!normalized) redirect("/admin/notifications?error=smssender");
    values.SMS4FREE_SENDER = normalized;
  }
  if (text("key")) values.SMS4FREE_KEY = text("key");
  if (text("pass")) values.SMS4FREE_PASS = text("pass");

  const { error } = await saveSettings(values);
  if (error) redirect("/admin/notifications?error=save");
  await logAdminEvent("update", {
    entityType: "sms_settings",
    entityLabel: "פרטי חיבור SMS",
    changes: { fields: [null, Object.keys(values).join(", ")] },
  });
  revalidatePath("/admin/notifications");
  redirect("/admin/notifications?saved=sms");
}

export async function addSmsRecipient(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;

  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  if (!phone) redirect("/admin/notifications?error=phone");

  const { error } = await supabaseAdmin()
    .from("sms_recipients")
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

export async function updateSmsRecipient(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabaseAdmin()
    .from("sms_recipients")
    .update({
      notify_shop_order: formData.get("notifyShopOrder") === "on",
      notify_event_inquiry: formData.get("notifyEventInquiry") === "on",
      notify_meal_registration: formData.get("notifyMealRegistration") === "on",
      notify_contact_message: formData.get("notifyContactMessage") === "on",
    })
    .eq("id", id);
  revalidatePath("/admin/notifications");
}

export async function deleteSmsRecipient(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabaseAdmin().from("sms_recipients").delete().eq("id", id);
  revalidatePath("/admin/notifications");
}

/** Sends a test message to one number; the result shows up in the send log on the same page. */
export async function testSmsRecipient(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { data } = await supabaseAdmin().from("sms_recipients").select("phone").eq("id", id).single();
  if (data?.phone) {
    await sendAndLogSms("test", data.phone, {
      kind: "הודעת בדיקה",
      customer: "בדיקת מערכת",
      details: "אם הגיעה אליך ההודעה הזו, ההתראות ב-SMS עובדות",
    });
  }
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
