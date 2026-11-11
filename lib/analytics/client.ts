// Browser side of the site analytics (see components/site/Analytics.tsx for what
// is collected and app/api/track/route.ts for the receiving end).
//
// Privacy by design: no cookies, nothing in localStorage except an opt-out flag,
// no IP address stored. The session id lives only in the tab's sessionStorage.
// Do Not Track / Global Privacy Control and an explicit opt-out are respected.

export type EventType =
  | "pageview"
  | "page_leave"
  | "click"
  | "product_view"
  | "add_to_cart"
  | "remove_from_cart"
  | "cart_open"
  | "coupon_apply"
  | "checkout_start"
  | "checkout_submit"
  | "purchase"
  | "meal_register_open"
  | "meal_register_submit"
  | "meal_paid"
  | "event_inquiry_open"
  | "event_inquiry_submit"
  | "contact_submit"
  | "newsletter_signup"
  | "filter_use"
  | "js_error";

interface QueuedEvent {
  type: EventType;
  path: string;
  ts: number;
  value?: number;
  props?: Record<string, unknown>;
  dedupe?: string;
  ref?: string;
  utm?: { source?: string; medium?: string; campaign?: string };
  locale?: string;
}

const ENDPOINT = "/api/track";
const SESSION_KEY = "ybr_sid";
const OPT_OUT_KEY = "ybr_notrack";

const queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let memorySession: string | null = null;
let enabledCache: boolean | null = null;

function safeStorage(kind: "session" | "local"): Storage | null {
  try {
    return kind === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

export function trackingEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (enabledCache !== null) return enabledCache;

  // ?notrack=1 switches tracking off in this browser (for the owner / team), ?notrack=0 back on.
  const flag = new URLSearchParams(window.location.search).get("notrack");
  const local = safeStorage("local");
  if (flag === "1") local?.setItem(OPT_OUT_KEY, "1");
  if (flag === "0") local?.removeItem(OPT_OUT_KEY);

  const nav = navigator as Navigator & { globalPrivacyControl?: boolean; msDoNotTrack?: string };
  const dnt = nav.doNotTrack === "1" || nav.msDoNotTrack === "1" || nav.globalPrivacyControl === true;
  enabledCache = !dnt && local?.getItem(OPT_OUT_KEY) !== "1";
  return enabledCache;
}

export function getSessionId(): string {
  const store = safeStorage("session");
  let id = store?.getItem(SESSION_KEY) ?? memorySession;
  if (!id) {
    id = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/-/g, "").slice(0, 24);
    memorySession = id;
    try {
      store?.setItem(SESSION_KEY, id);
    } catch {
      /* in-memory only */
    }
  }
  return id;
}

function send(events: QueuedEvent[], beacon: boolean) {
  if (events.length === 0) return;
  const body = JSON.stringify({ sid: getSessionId(), vw: window.innerWidth, events });
  try {
    if (beacon && navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "text/plain" }))) return;
    void fetch(ENDPOINT, { method: "POST", body, headers: { "Content-Type": "text/plain" }, keepalive: true }).catch(() => {});
  } catch {
    /* analytics must never break the site */
  }
}

export function flush(beacon = false) {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
  const batch = queue.splice(0, 25);
  send(batch, beacon);
  if (queue.length > 0) flush(beacon);
}

export function track(
  type: EventType,
  props?: Record<string, unknown>,
  extra?: { value?: number; dedupe?: string; path?: string; ref?: string; utm?: QueuedEvent["utm"] }
) {
  if (!trackingEnabled()) return;
  const path = extra?.path ?? window.location.pathname;
  queue.push({
    type,
    path,
    ts: Date.now(),
    props,
    value: extra?.value,
    dedupe: extra?.dedupe,
    ref: extra?.ref,
    utm: extra?.utm,
    locale: path === "/en" || path.startsWith("/en/") ? "en" : "he",
  });
  if (queue.length >= 20) flush();
  else if (!flushTimer) flushTimer = setTimeout(() => flush(), 4000);
}
