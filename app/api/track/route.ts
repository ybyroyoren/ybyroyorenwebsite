import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

// Receives the batches sent by lib/analytics/client.ts. Stores no IP address and
// sets no cookie: visitors are told apart only by a hash of (IP + browser + day +
// a server secret) that changes every day, so nobody can be followed across days.

export const runtime = "nodejs";

const ALLOWED = new Set([
  "pageview",
  "page_leave",
  "click",
  "product_view",
  "add_to_cart",
  "remove_from_cart",
  "cart_open",
  "coupon_apply",
  "checkout_start",
  "checkout_submit",
  "purchase",
  "meal_register_open",
  "meal_register_submit",
  "meal_paid",
  "event_inquiry_open",
  "event_inquiry_submit",
  "contact_submit",
  "newsletter_signup",
  "filter_use",
  "js_error",
]);

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|monitor|curl|wget|python|node-fetch|axios/i;

function text(value: unknown, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function parseUa(ua: string): { device: string; browser: string; os: string } {
  const device = /iPad|Tablet/i.test(ua) ? "tablet" : /Mobi|Android|iPhone/i.test(ua) ? "mobile" : "desktop";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /SamsungBrowser/.test(ua)
        ? "Samsung"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /(Chrome|CriOS)\//.test(ua)
            ? "Chrome"
            : /Safari\//.test(ua)
              ? "Safari"
              : "Other";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /iPhone|iPad|iPod/.test(ua)
      ? "iOS"
      : /Android/.test(ua)
        ? "Android"
        : /Mac OS X|Macintosh/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Other";
  return { device, browser, os };
}

export async function POST(request: NextRequest) {
  // Logged-in admins browsing the site are not visitors.
  if (request.cookies.getAll().some((c) => /^sb-.*-auth-token/.test(c.name))) return new NextResponse(null, { status: 204 });

  const ua = request.headers.get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) return new NextResponse(null, { status: 204 });

  let body: { sid?: unknown; vw?: unknown; events?: unknown };
  try {
    const raw = await request.text();
    if (raw.length > 30_000) return new NextResponse(null, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const sid = text(body.sid, 40);
  if (!sid || !Array.isArray(body.events)) return new NextResponse(null, { status: 400 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
  const salt = process.env.ANALYTICS_SALT ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const visitorHash = createHash("sha256").update(`${ip}|${ua}|${day}|${salt}`).digest("hex").slice(0, 16);
  const country = text(request.headers.get("x-vercel-ip-country"), 2);
  const agent = parseUa(ua);
  const viewport = typeof body.vw === "number" ? body.vw : 0;
  const device = viewport > 0 && viewport < 768 ? "mobile" : viewport >= 768 && viewport < 1100 && agent.device !== "desktop" ? "tablet" : agent.device;

  const now = Date.now();
  const rows = (body.events as Record<string, unknown>[])
    .slice(0, 25)
    .flatMap((e) => {
      const type = text(e.type, 40);
      const path = text(e.path, 300);
      if (!type || !ALLOWED.has(type) || !path || !path.startsWith("/")) return [];
      const ts = typeof e.ts === "number" && Math.abs(now - e.ts) < 6 * 3600 * 1000 ? new Date(e.ts).toISOString() : new Date().toISOString();
      const utm = (e.utm ?? {}) as Record<string, unknown>;
      const rawProps = e.props && typeof e.props === "object" ? (e.props as Record<string, unknown>) : {};
      // Keep props small and flat-ish.
      const props = Object.fromEntries(
        Object.entries(rawProps)
          .slice(0, 12)
          .map(([k, v]) => [k.slice(0, 40), typeof v === "string" ? v.slice(0, 160) : typeof v === "number" || typeof v === "boolean" ? v : null])
      );
      return [
        {
          created_at: ts,
          session_id: sid,
          visitor_hash: visitorHash,
          type,
          path,
          locale: e.locale === "en" ? "en" : "he",
          referrer_host: text(e.ref, 120),
          utm_source: text(utm.source, 80),
          utm_medium: text(utm.medium, 80),
          utm_campaign: text(utm.campaign, 80),
          device,
          browser: agent.browser,
          os: agent.os,
          country,
          value: typeof e.value === "number" && Number.isFinite(e.value) ? e.value : null,
          props,
          dedupe_key: text(e.dedupe, 120),
        },
      ];
    });

  if (rows.length > 0) {
    const { error } = await supabaseAdmin().from("analytics_events").upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: true });
    if (error) console.error("[analytics] insert failed", error.message);
  }
  return new NextResponse(null, { status: 204 });
}
