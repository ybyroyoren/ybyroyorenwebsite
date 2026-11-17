import "server-only";
import { createSign } from "node:crypto";
import { getSettings } from "@/lib/integrationSettings";

// A small Google Calendar client (REST, no SDK) using a service account: the account's own sign-in is a signed
// JWT exchanged for a one-hour access token, and the target calendar is shared with the service account's e-mail
// address ("make changes to events"). Details are saved from the calendar admin screen, or come from the
// environment (GOOGLE_CALENDAR_ID, GOOGLE_SERVICE_ACCOUNT_JSON).

const SCOPE = "https://www.googleapis.com/auth/calendar";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/calendar/v3";
const TIMEOUT_MS = 15000;

export const GOOGLE_SETTING_NAMES = ["GOOGLE_CALENDAR_ID", "GOOGLE_SERVICE_ACCOUNT_JSON"] as const;

export interface GoogleConfig {
  calendarId: string;
  clientEmail: string;
  privateKey: string;
}

/** What is configured, without exposing the key. `config` is null until both parts are there and valid. */
export async function loadGoogleConfig(): Promise<{ config: GoogleConfig | null; calendarId: string; clientEmail: string; problem: string | null }> {
  let saved: Record<string, string> = {};
  try {
    saved = await getSettings([...GOOGLE_SETTING_NAMES]);
  } catch {
    // table not there yet
  }
  const calendarId = (saved.GOOGLE_CALENDAR_ID || process.env.GOOGLE_CALENDAR_ID || "").trim();
  const rawKey = (saved.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "").trim();

  let clientEmail = "";
  let privateKey = "";
  let problem: string | null = null;
  if (rawKey) {
    try {
      const parsed = JSON.parse(rawKey) as { client_email?: string; private_key?: string };
      clientEmail = parsed.client_email ?? "";
      privateKey = (parsed.private_key ?? "").replace(/\\n/g, "\n");
      if (!clientEmail || !privateKey) problem = "קובץ המפתח חסר client_email או private_key";
    } catch {
      problem = "קובץ המפתח אינו JSON תקין";
    }
  }
  const config = calendarId && clientEmail && privateKey && !problem ? { calendarId, clientEmail, privateKey } : null;
  return { config, calendarId, clientEmail, problem };
}

const b64url = (input: Buffer | string) => Buffer.from(input).toString("base64url");

let cachedToken: { token: string; expires: number; email: string } | null = null;

async function accessToken(config: GoogleConfig): Promise<string> {
  if (cachedToken && cachedToken.email === config.clientEmail && cachedToken.expires > Date.now() + 60_000) return cachedToken.token;

  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(
    JSON.stringify({ iss: config.clientEmail, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 })
  )}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(config.privateKey);
  const assertion = `${unsigned}.${b64url(signature)}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new GoogleError(res.status, `התחברות ל-Google נכשלה (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expires: Date.now() + data.expires_in * 1000, email: config.clientEmail };
  return data.access_token;
}

export class GoogleError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

async function call<T>(config: GoogleConfig, method: string, path: string, body?: unknown): Promise<T | null> {
  const token = await accessToken(config);
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (res.status === 204) return null;
  if (!res.ok) {
    let reason = "";
    try {
      reason = ((await res.json()) as { error?: { message?: string } }).error?.message ?? "";
    } catch {
      // not JSON
    }
    throw new GoogleError(res.status, `Google Calendar ${res.status}: ${reason || res.statusText}`);
  }
  return (await res.json()) as T;
}

// ---------- events ----------

export interface GoogleTime {
  date?: string;
  dateTime?: string;
  timeZone?: string;
}

export interface GoogleEventBody {
  summary: string;
  description?: string;
  location?: string;
  start: GoogleTime;
  end: GoogleTime;
  colorId?: string;
  status?: "confirmed" | "cancelled";
  extendedProperties?: { private?: Record<string, string> };
}

export interface GoogleEvent extends GoogleEventBody {
  id: string;
  updated?: string;
  recurrence?: string[];
  recurringEventId?: string;
}

const cal = (c: GoogleConfig) => `/calendars/${encodeURIComponent(c.calendarId)}`;

export async function getCalendar(config: GoogleConfig): Promise<{ summary: string; timeZone?: string }> {
  return (await call<{ summary: string; timeZone?: string }>(config, "GET", cal(config)))!;
}

export const insertEvent = (config: GoogleConfig, id: string, body: GoogleEventBody) =>
  call<GoogleEvent>(config, "POST", `${cal(config)}/events`, { ...body, id }) as Promise<GoogleEvent>;

export const patchEvent = (config: GoogleConfig, id: string, body: Partial<GoogleEventBody>) =>
  call<GoogleEvent>(config, "PATCH", `${cal(config)}/events/${id}`, body) as Promise<GoogleEvent>;

export async function deleteEvent(config: GoogleConfig, id: string): Promise<void> {
  try {
    await call(config, "DELETE", `${cal(config)}/events/${id}`);
  } catch (e) {
    // already gone is fine
    if (!(e instanceof GoogleError) || (e.status !== 404 && e.status !== 410)) throw e;
  }
}

/** Changes since `syncToken` (or every event, when there is none). `tokenExpired` means start over. */
export async function listChanges(
  config: GoogleConfig,
  syncToken: string | null
): Promise<{ events: GoogleEvent[]; nextSyncToken: string | null; tokenExpired: boolean }> {
  const events: GoogleEvent[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 20; page++) {
    const params = new URLSearchParams({ showDeleted: "true", maxResults: "250" });
    if (syncToken) params.set("syncToken", syncToken);
    if (pageToken) params.set("pageToken", pageToken);
    try {
      const data = await call<{ items?: GoogleEvent[]; nextPageToken?: string; nextSyncToken?: string }>(
        config,
        "GET",
        `${cal(config)}/events?${params}`
      );
      events.push(...(data?.items ?? []));
      if (data?.nextPageToken) {
        pageToken = data.nextPageToken;
        continue;
      }
      return { events, nextSyncToken: data?.nextSyncToken ?? null, tokenExpired: false };
    } catch (e) {
      if (e instanceof GoogleError && e.status === 410) return { events: [], nextSyncToken: null, tokenExpired: true };
      throw e;
    }
  }
  return { events, nextSyncToken: null, tokenExpired: false };
}
