import "server-only";
import { Resend } from "resend";

// Transactional email — order/registration confirmations only (no scheduled
// reminders in Phase 1, per the owner's request).

function client() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

interface SendParams {
  to: string;
  subject: string;
  html: string;
}

async function send({ to, subject, html }: SendParams): Promise<void> {
  const resend = client();
  if (!resend) {
    console.warn(`[resend] RESEND_API_KEY not set — skipping email "${subject}" to ${to}.`);
    return;
  }

  const from = process.env.RESEND_FROM_EMAIL ?? "Y by Roy Oren <onboarding@resend.dev>";
  await resend.emails.send({ from, to, subject, html });
}

export async function sendOrderConfirmationEmail(params: {
  to: string;
  customerName: string;
  orderId: string;
  pickupDate: string;
  totalFormatted: string;
}): Promise<void> {
  await send({
    to: params.to,
    subject: "אישור הזמנה — Y by Roy Oren",
    html: `
      <div dir="rtl" style="font-family: sans-serif;">
        <h2>תודה על ההזמנה, ${params.customerName}!</h2>
        <p>מספר הזמנה: ${params.orderId}</p>
        <p>תאריך איסוף: ${params.pickupDate}</p>
        <p>סה"כ ששולם: ${params.totalFormatted}</p>
        <p>איסוף עצמי מרחוב השוק 34, תל אביב.</p>
      </div>
    `,
  });
}

export async function sendMealRegistrationConfirmationEmail(params: {
  to: string;
  customerName: string;
  mealTitle: string;
  mealDate: string;
  seats: number;
  depositFormatted: string;
  balanceFormatted: string;
}): Promise<void> {
  await send({
    to: params.to,
    subject: "אישור הרשמה לארוחה — Y by Roy Oren",
    html: `
      <div dir="rtl" style="font-family: sans-serif;">
        <h2>המקום שלך שוריין, ${params.customerName}!</h2>
        <p>${params.mealTitle} — ${params.mealDate}</p>
        <p>מספר סועדים: ${params.seats}</p>
        <p>מקדמה ששולמה: ${params.depositFormatted}</p>
        <p>יתרה לתשלום במקום: ${params.balanceFormatted}</p>
        <p>ביטול חינם עד 96 שעות לפני הארוחה.</p>
      </div>
    `,
  });
}

export async function sendContactNotificationEmail(params: {
  name: string;
  phone: string;
  email: string;
  message: string;
}): Promise<void> {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail) return;

  await send({
    to: adminEmail,
    subject: `הודעה חדשה מהאתר — ${params.name}`,
    html: `
      <div dir="rtl" style="font-family: sans-serif;">
        <p><b>שם:</b> ${params.name}</p>
        <p><b>טלפון:</b> ${params.phone}</p>
        <p><b>אימייל:</b> ${params.email}</p>
        <p><b>הודעה:</b> ${params.message}</p>
      </div>
    `,
  });
}
