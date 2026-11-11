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

export async function sendEmail({ to, subject, html }: SendParams): Promise<void> {
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
  await sendEmail({
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
  await sendEmail({
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

export async function sendPasswordResetEmail(params: { to: string; link: string }): Promise<void> {
  await sendEmail({
    to: params.to,
    subject: "איפוס סיסמה לתוכנת הניהול — Y by Roy Oren",
    html: `
      <div dir="rtl" style="font-family: sans-serif; line-height: 1.7;">
        <h2>איפוס סיסמה</h2>
        <p>התקבלה בקשה לאיפוס הסיסמה לתוכנת הניהול של Y by Roy Oren.</p>
        <p><a href="${params.link}" style="display:inline-block;padding:12px 24px;background:#3d4828;color:#fff;border-radius:999px;text-decoration:none;font-weight:600;">בחירת סיסמה חדשה</a></p>
        <p>הקישור תקף לשעה אחת ואפשר להשתמש בו פעם אחת בלבד.</p>
        <p style="color:#666;">אם לא ביקשת לאפס את הסיסמה, אפשר להתעלם מהמייל. הסיסמה הנוכחית לא תשתנה.</p>
      </div>
    `,
  });
}
