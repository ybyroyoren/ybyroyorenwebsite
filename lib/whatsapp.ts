import "server-only";

// WhatsApp alerts through Meta's WhatsApp Cloud API. A business can only start a conversation with an approved
// message template, so every alert uses ONE template (see the setup notes on the notifications admin page):
//
//   התראה חדשה מהאתר: {{1}}
//   לקוח: {{2}}
//   פרטים: {{3}}
//   ההודעה נשלחה אוטומטית מ-Y by Roy Oren.
//
// Env (Vercel): WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, and optionally WHATSAPP_TEMPLATE_NAME (default
// "site_alert") and WHATSAPP_TEMPLATE_LANG (default "he").

const GRAPH_URL = "https://graph.facebook.com/v21.0";
const TIMEOUT_MS = 6000;

export function missingWhatsAppConfig(): string[] {
  return ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"].filter((k) => !process.env[k]);
}

/** Israeli / international phone -> digits only with country code (054-1234567 -> 972541234567), or null. */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `972${digits.slice(1)}`;
  digits = digits.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

/** Template variables can't contain line breaks, tabs or long runs of spaces, and can't be empty. */
function param(value: string, max = 300): string {
  const clean = value.replace(/\s+/g, " ").trim().slice(0, max);
  return clean || "—";
}

export interface WhatsAppAlert {
  /** What happened, e.g. "הזמנה חדשה בחנות". */
  kind: string;
  /** Customer name and phone. */
  customer: string;
  /** The key details in one line. */
  details: string;
}

export async function sendWhatsAppAlert(to: string, alert: WhatsAppAlert): Promise<{ ok: true } | { ok: false; error: string }> {
  const missing = missingWhatsAppConfig();
  if (missing.length > 0) return { ok: false, error: `חסר חיבור לוואטסאפ (${missing.join(", ")})` };

  const body = JSON.stringify({
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: process.env.WHATSAPP_TEMPLATE_NAME || "site_alert",
      language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "he" },
      components: [
        {
          type: "body",
          parameters: [param(alert.kind, 80), param(alert.customer, 120), param(alert.details, 600)].map((text) => ({ type: "text", text })),
        },
      ],
    },
  });

  let lastError = "שגיאה לא ידועה";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${GRAPH_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.ok) return { ok: true };
      const data = (await res.json().catch(() => null)) as { error?: { message?: string; code?: number; error_data?: { details?: string } } } | null;
      lastError = `${data?.error?.message ?? `HTTP ${res.status}`}${data?.error?.code ? ` (קוד ${data.error.code})` : ""}${
        data?.error?.error_data?.details ? ` — ${data.error.error_data.details}` : ""
      }`;
      // Only temporary problems are worth another try.
      if (res.status < 500 && res.status !== 429) break;
    } catch (e) {
      lastError = e instanceof Error ? e.message : "החיבור נכשל";
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  return { ok: false, error: lastError.slice(0, 500) };
}
