import "server-only";
import { toLocalIsraeli } from "@/lib/phone";
import { getSettings } from "@/lib/integrationSettings";

// SMS alerts through SMS4Free's API (https://api.sms4free.co.il/ApiSMS/v2/SendSMS, JSON POST).
//
// Settings (entered on the notifications admin screen, or as Vercel env variables): SMS4FREE_KEY (API key),
// SMS4FREE_USER (the phone number the account was opened with), SMS4FREE_PASS (the account password) and
// SMS4FREE_SENDER (the sender shown on the phone: the phone number the account was opened with, or a name of up
// to 11 English letters/digits that the account is allowed to use).

const API_URL = "https://api.sms4free.co.il/ApiSMS/v2/SendSMS";
const TIMEOUT_MS = 8000;

const FIELDS = ["SMS4FREE_KEY", "SMS4FREE_USER", "SMS4FREE_PASS", "SMS4FREE_SENDER"] as const;
export type SmsField = (typeof FIELDS)[number];

export interface SmsConfig {
  values: Record<SmsField, string>;
  /** Where each value came from: the admin screen, an environment variable, or nowhere. */
  source: Record<SmsField, "screen" | "env" | null>;
}

/** Connection details: saved from the admin screen first, otherwise the environment variables. */
export async function getSmsConfig(): Promise<SmsConfig> {
  let saved: Record<string, string> = {};
  try {
    saved = await getSettings([...FIELDS]);
  } catch {
    // table not there yet: fall back to the environment
  }
  const values = {} as Record<SmsField, string>;
  const source = {} as Record<SmsField, "screen" | "env" | null>;
  for (const f of FIELDS) {
    const fromScreen = (saved[f] ?? "").trim();
    const fromEnv = (process.env[f] ?? "").trim();
    values[f] = fromScreen || fromEnv;
    source[f] = fromScreen ? "screen" : fromEnv ? "env" : null;
  }
  return { values, source };
}

export function missingSmsFields(config: SmsConfig): SmsField[] {
  return FIELDS.filter((f) => !config.values[f]);
}

/** One short line: a Hebrew SMS part holds only ~70 characters, so keep alerts compact. */
export function smsText(alert: { kind: string; customer: string; details: string }): string {
  const text = `${alert.kind}: ${alert.customer} | ${alert.details}`.replace(/\s+/g, " ").trim();
  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
}

export async function sendSms(phoneDigits: string, text: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const config = await getSmsConfig();
  const missing = missingSmsFields(config);
  if (missing.length > 0) return { ok: false, error: `חסר חיבור ל-SMS (${missing.join(", ")})` };

  const body = JSON.stringify({
    key: config.values.SMS4FREE_KEY,
    user: config.values.SMS4FREE_USER,
    pass: config.values.SMS4FREE_PASS,
    sender: config.values.SMS4FREE_SENDER,
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
      if (data?.status === -1) lastError += " — בדקו מפתח, משתמש וסיסמה במסך ההתראות";
      // Only temporary problems are worth another try.
      if (res.status < 500 && res.status !== 429) break;
    } catch (e) {
      lastError = e instanceof Error ? e.message : "החיבור נכשל";
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  return { ok: false, error: lastError.slice(0, 500) };
}
