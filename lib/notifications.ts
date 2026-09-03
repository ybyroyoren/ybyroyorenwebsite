import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/resend";

export type NotificationType = "shop_order" | "event_inquiry" | "meal_registration" | "contact_message";

const COLUMN: Record<NotificationType, string> = {
  shop_order: "notify_shop_order",
  event_inquiry: "notify_event_inquiry",
  meal_registration: "notify_meal_registration",
  contact_message: "notify_contact_message",
};

export interface NotificationRecipient {
  id: string;
  email: string;
  notifyShopOrder: boolean;
  notifyEventInquiry: boolean;
  notifyMealRegistration: boolean;
  notifyContactMessage: boolean;
}

export async function getNotificationRecipients(): Promise<NotificationRecipient[]> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("notification_recipients")
    .select("id, email, notify_shop_order, notify_event_inquiry, notify_meal_registration, notify_contact_message")
    .order("created_at", { ascending: true });

  return (data ?? []).map((r) => ({
    id: r.id,
    email: r.email,
    notifyShopOrder: r.notify_shop_order,
    notifyEventInquiry: r.notify_event_inquiry,
    notifyMealRegistration: r.notify_meal_registration,
    notifyContactMessage: r.notify_contact_message,
  }));
}

async function getRecipientEmails(type: NotificationType): Promise<string[]> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("notification_recipients")
    .select("email, notify_shop_order, notify_event_inquiry, notify_meal_registration, notify_contact_message");
  return (data ?? [])
    .filter((r) => (r as unknown as Record<string, boolean>)[COLUMN[type]])
    .map((r) => r.email);
}

async function alert(type: NotificationType, subject: string, html: string): Promise<void> {
  const recipients = await getRecipientEmails(type);
  await Promise.all(recipients.map((to) => sendEmail({ to, subject, html })));
}

export async function notifyNewOrder(params: {
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  pickupDate: string;
  totalFormatted: string;
  items: { name: string; qty: number }[];
}): Promise<void> {
  await alert(
    "shop_order",
    `הזמנה חדשה מהחנות — ${params.customerName}`,
    `
      <div dir="rtl" style="font-family: sans-serif;">
        <h2>הזמנה חדשה נכנסה</h2>
        <p><b>מספר הזמנה:</b> ${params.orderId}</p>
        <p><b>לקוח:</b> ${params.customerName} · ${params.customerPhone} · ${params.customerEmail}</p>
        <p><b>תאריך איסוף:</b> ${params.pickupDate}</p>
        <p><b>מוצרים:</b></p>
        <ul>${params.items.map((i) => `<li>${i.name} × ${i.qty}</li>`).join("")}</ul>
        <p><b>סה&quot;כ שולם:</b> ${params.totalFormatted}</p>
      </div>
    `
  );
}

export async function notifyNewEventInquiry(params: {
  fullName: string;
  phone: string;
  email: string;
  summary: string;
}): Promise<void> {
  await alert(
    "event_inquiry",
    `פנייה חדשה לאירוע פרטי — ${params.fullName}`,
    `
      <div dir="rtl" style="font-family: sans-serif;">
        <p><b>שם:</b> ${params.fullName}</p>
        <p><b>טלפון:</b> ${params.phone}</p>
        <p><b>אימייל:</b> ${params.email}</p>
        <p style="white-space: pre-line;">${params.summary}</p>
      </div>
    `
  );
}

export async function notifyNewMealRegistration(params: {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  mealTitle: string;
  mealDate: string;
  seats: number;
}): Promise<void> {
  await alert(
    "meal_registration",
    `הרשמה חדשה לארוחה פתוחה — ${params.customerName}`,
    `
      <div dir="rtl" style="font-family: sans-serif;">
        <h2>הרשמה חדשה לארוחה</h2>
        <p><b>לקוח:</b> ${params.customerName} · ${params.customerPhone} · ${params.customerEmail}</p>
        <p><b>ארוחה:</b> ${params.mealTitle} — ${params.mealDate}</p>
        <p><b>מספר סועדים:</b> ${params.seats}</p>
      </div>
    `
  );
}

export async function notifyNewContactMessage(params: {
  name: string;
  phone: string;
  email: string;
  message: string;
}): Promise<void> {
  await alert(
    "contact_message",
    `הודעה חדשה מהאתר — ${params.name}`,
    `
      <div dir="rtl" style="font-family: sans-serif;">
        <p><b>שם:</b> ${params.name}</p>
        <p><b>טלפון:</b> ${params.phone}</p>
        <p><b>אימייל:</b> ${params.email}</p>
        <p><b>הודעה:</b> ${params.message}</p>
      </div>
    `
  );
}
