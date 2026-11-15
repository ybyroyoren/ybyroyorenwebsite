import "server-only";
import { toLocalIsraeli } from "@/lib/phone";

// SMS alerts through SMS4Free's API (https://api.sms4free.co.il/ApiSMS/v2/SendSMS, JSON POST).
//
// Env (Vercel): SMS4FREE_KEY (API key), SMS4FREE_USER (the phone number the account was opened with),
// SMS4FREE_PASS (the account password) and SMS4FREE_SENDER (the sender shown on the phone: the phone number
// the account was opened with, or a name of up to 11 English letters/digits that the account is allowed to use).

const API_URL = "https://api.sms4free.co.il/ApiSMS/v2/SendSMS";
const TIMEOUT_MS = 8000;

export function missingSmsConfig(): string[] {
  return ["SMS4FREE_KEY", "SMS4FREE_USER", "SMS4FREE_PASS", "SMS4FREE_SENDER"].filter((k) => !process.env[k]);
}

/** One short line: a Hebrew SMS part holds only ~70 characters, so keep alerts compact. */
export function smsText(alert: { kind: string; customer: string; details: string }): string {
  const text = `${alert.kind}: ${alert.customer} | ${alert.details}`.replace(/\s+/g, " ").trim();
  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
}

export async function sendSms(phoneDigits: string, text: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const missing = missingSmsConfig();
  if (missing.length > 0) return { ok: false, error: `חסר חיבור ל-SMS (${missing.join(", ")})` };

  const body = JSON.stringify({
    key: process.env.SMS4FREE_KEY,
    user: process.env.SMS4FREE_USER,
    pass: process.env.SMS4FREE_PASS,
    sender: process.env.SMS4FREE_SENDER,
    recipient: toLocalIsraeli(phoneDigits),
    msg: text,
  });

  let lastError = "שגיאה לא ידועה";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const data = (await res.json().catch(() => null)) as { status?: number; message?: string } | null;
      // status > 0: accepted (the number of messages sent); 0 or negative: an error described in "message".
      if (res.ok && data && typeof data.status === "number" && data.status > 0) return { ok: true };
      lastError = `${data?.message ?? `HTTP ${res.status}`}${typeof data?.status === "number" ? ` (קוד ${data.status})` : ""}`;
      // Only temporary problems are worth another try.
      if (res.status < 500 && res.status !== 429) break;
    } catch (e) {
      lastError = e instanceof Error ? e.message : "החיבור נכשל";
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  return { ok: false, error: lastError.slice(0, 500) };
}
