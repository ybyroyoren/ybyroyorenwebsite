import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

/**
 * Admin audit log: who did what in the admin panel.
 *
 * Instead of sprinkling log calls through ~70 server actions, the service-role
 * client (lib/supabase/server.ts) is wrapped by `withAudit` below: every
 * insert / update / upsert / delete that happens while a signed-in admin is
 * working inside /admin is recorded with the before/after values of the changed
 * fields. Requests with no admin session (customers, webhooks, the build) are
 * never touched, and logging can never break or alter the real query: all of it
 * is best-effort and wrapped in try/catch.
 */

export type AuditAction = "create" | "update" | "delete" | "reorder" | "login" | "logout" | "login_failed" | "other";

interface AuditAdmin {
  id: string;
  email: string;
  role: string;
}

// Tables never logged: the logs themselves, tracking data, and the customers' carts.
const SKIP_TABLES = new Set([
  "admin_audit_log",
  "analytics_events",
  "carts",
  "cart_items",
  "admin_profiles", // logged explicitly in lib/actions/admin/team.ts (with the e-mail)
  "product_categories", // logged explicitly, with names, in lib/actions/admin/products.ts
  "product_allergens",
  "notification_log", // send results written by the site itself
]);

// Join / child tables that are rewritten wholesale (delete everything, insert again) on every
// save of their parent. They are logged as at most one entry per admin per 30 seconds.
const COLLAPSED_TABLES = new Set([
  "kl_recipe_components",
  "kl_event_menu",
  "kl_event_guest_seats",
  "kl_event_completed_items",
]);

const NEVER_LOG_FIELDS = /password|token|secret|key$/i;
const NOISY_FIELDS = new Set(["updated_at", "created_at"]);
const LABEL_FIELDS = ["name", "title", "label_he", "label", "code", "customer_name", "full_name", "email", "location"];
const FILTER_METHODS = new Set(["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "is", "in", "match", "not", "or", "filter", "contains"]);
const MUTATIONS = new Set(["insert", "update", "upsert", "delete"]);

type Row = Record<string, unknown>;
interface Call {
  name: string;
  args: unknown[];
}

function clip(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.length > 160 ? `${value.slice(0, 160)}…` : value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  const text = JSON.stringify(value);
  return text.length > 160 ? `${text.slice(0, 160)}…` : JSON.parse(text);
}

function rawClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

/** The signed-in admin of this request, or null for any request that isn't an admin working in /admin. */
const currentAuditAdmin = cache(async (): Promise<AuditAdmin | null> => {
  try {
    // Test hook (scripts only; never set in the app): lets a script act as a given admin.
    if (process.env.NODE_ENV === "test") return (globalThis as { __auditTestAdmin?: AuditAdmin | null }).__auditTestAdmin ?? null;
    const jar = await cookies();
    if (!jar.getAll().some((c) => /^sb-.*-auth-token/.test(c.name))) return null;

    // Only requests that come from an admin page (server actions post from the page's URL).
    const h = await headers();
    const referer = h.get("referer");
    if (!referer || !new URL(referer).pathname.startsWith("/admin")) return null;

    const auth = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: { getAll: () => jar.getAll() },
    });
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) return null;
    const { data: profile } = await rawClient().from("admin_profiles").select("role").eq("id", user.id).maybeSingle();
    if (!profile) return null;
    return { id: user.id, email: user.email ?? "", role: profile.role };
  } catch {
    return null;
  }
});

async function requestMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    return { ip, userAgent: (h.get("user-agent") ?? "").slice(0, 200) || null };
  } catch {
    return { ip: null, userAgent: null };
  }
}

async function insertLog(entry: {
  admin: AuditAdmin | null;
  action: AuditAction;
  entityType?: string | null;
  entityId?: string | null;
  entityLabel?: string | null;
  changes?: unknown;
}): Promise<void> {
  const meta = await requestMeta();
  await rawClient()
    .from("admin_audit_log")
    .insert({
      admin_id: entry.admin?.id ?? null,
      admin_email: entry.admin?.email ?? null,
      admin_role: entry.admin?.role ?? null,
      action: entry.action,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
      entity_label: entry.entityLabel ?? null,
      changes: entry.changes ?? null,
      ip: meta.ip,
      user_agent: meta.userAgent,
    });
}

/** Explicit log line for things that aren't a plain table write (login, logout, team changes, categories of a product...). */
export async function logAdminEvent(
  action: AuditAction,
  details: { entityType?: string; entityId?: string; entityLabel?: string; changes?: unknown; admin?: AuditAdmin | null }
): Promise<void> {
  try {
    const admin = details.admin !== undefined ? details.admin : await currentAuditAdmin();
    if (details.admin === undefined && !admin) return;
    await insertLog({ admin, action, ...details });
  } catch (err) {
    console.error("[audit] failed to write log entry", err);
  }
}

/** Failed sign-in attempt (no session exists). Throttled so it can't be used to flood the log. */
export async function logLoginFailure(email: string): Promise<void> {
  try {
    const { count } = await rawClient()
      .from("admin_audit_log")
      .select("id", { count: "exact", head: true })
      .eq("action", "login_failed")
      .gte("created_at", new Date(Date.now() - 3600 * 1000).toISOString());
    if ((count ?? 0) >= 50) return;
    await insertLog({ admin: null, action: "login_failed", entityType: "login", entityLabel: email.trim().slice(0, 100) });
  } catch (err) {
    console.error("[audit] failed to log login failure", err);
  }
}

function pickLabel(row: Row | undefined): string | null {
  if (!row) return null;
  for (const field of LABEL_FIELDS) {
    const v = row[field];
    if (typeof v === "string" && v.trim()) return v.trim().slice(0, 80);
  }
  return null;
}

function diff(before: Row, patch: Row): Record<string, [unknown, unknown]> {
  const changes: Record<string, [unknown, unknown]> = {};
  for (const [key, next] of Object.entries(patch)) {
    if (NOISY_FIELDS.has(key) || NEVER_LOG_FIELDS.test(key)) continue;
    const prev = before[key];
    if (JSON.stringify(prev ?? null) === JSON.stringify(next ?? null)) continue;
    changes[key] = [clip(prev), clip(next)];
  }
  return changes;
}

function snapshot(row: Row): Record<string, [unknown, unknown]> {
  const out: Record<string, [unknown, unknown]> = {};
  for (const [key, value] of Object.entries(row)) {
    if (NOISY_FIELDS.has(key) || NEVER_LOG_FIELDS.test(key) || key === "id" || value === null || value === "") continue;
    out[key] = [null, clip(value)];
    if (Object.keys(out).length >= 14) break;
  }
  return out;
}

async function recentlyLogged(admin: AuditAdmin, table: string, seconds: number, action?: AuditAction): Promise<boolean> {
  let query = rawClient()
    .from("admin_audit_log")
    .select("id", { count: "exact", head: true })
    .eq("admin_email", admin.email)
    .eq("entity_type", table)
    .gte("created_at", new Date(Date.now() - seconds * 1000).toISOString());
  if (action) query = query.eq("action", action);
  const { count } = await query;
  return (count ?? 0) > 0;
}

async function fetchBefore(table: string, calls: Call[]): Promise<Row[]> {
  try {
    let q = rawClient().from(table).select("*");
    for (const c of calls) {
      if (FILTER_METHODS.has(c.name)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        q = (q as any)[c.name](...c.args);
      }
    }
    const { data } = await q.limit(50);
    return (data ?? []) as Row[];
  } catch {
    return [];
  }
}

/** Runs the real query and records it. Never throws because of the logging. */
async function runAndRecord(real: PromiseLike<unknown>, table: string, calls: Call[]): Promise<unknown> {
  const mutation = calls.find((c) => MUTATIONS.has(c.name));
  if (!mutation || SKIP_TABLES.has(table)) return real;

  let admin: AuditAdmin | null = null;
  let before: Row[] = [];
  try {
    admin = await currentAuditAdmin();
    if (admin && (mutation.name === "update" || mutation.name === "delete")) {
      before = await fetchBefore(table, calls);
    }
  } catch {
    admin = null;
  }

  const result = (await real) as { error?: unknown; data?: unknown };
  if (!admin || result?.error) return result;

  try {
    const payload = mutation.args[0];
    const payloadRows: Row[] = Array.isArray(payload) ? (payload as Row[]) : payload && typeof payload === "object" ? [payload as Row] : [];

    if (COLLAPSED_TABLES.has(table)) {
      if (!(await recentlyLogged(admin, table, 30))) {
        await insertLog({ admin, action: "update", entityType: table, changes: { _note: "collapsed" } });
      }
      return result;
    }

    if (mutation.name === "insert") {
      for (const row of payloadRows.slice(0, 20)) {
        await insertLog({ admin, action: "create", entityType: table, entityLabel: pickLabel(row), changes: snapshot(row) });
      }
    } else if (mutation.name === "delete") {
      if (before.length === 0) return result;
      for (const row of before.slice(0, 20)) {
        await insertLog({
          admin,
          action: "delete",
          entityType: table,
          entityId: typeof row.id === "string" ? row.id : null,
          entityLabel: pickLabel(row),
          changes: snapshot(row),
        });
      }
    } else if (mutation.name === "update") {
      const patch = (payloadRows[0] ?? {}) as Row;
      if (before.length === 0) return result;
      if (before.length > 1) {
        const changed = diff(before[0], patch);
        if (Object.keys(changed).length > 0) {
          await insertLog({ admin, action: "update", entityType: table, entityLabel: `${before.length}`, changes: changed });
        }
        return result;
      }
      const row = before[0];
      const changed = diff(row, patch);
      const keys = Object.keys(changed);
      if (keys.length === 0) return result;
      if (keys.every((k) => k === "sort_order")) {
        // Reordering rewrites the position of every item: one entry per minute is enough.
        if (!(await recentlyLogged(admin, table, 60, "reorder"))) {
          await insertLog({ admin, action: "reorder", entityType: table, entityLabel: pickLabel(row) });
        }
        return result;
      }
      await insertLog({
        admin,
        action: "update",
        entityType: table,
        entityId: typeof row.id === "string" ? row.id : null,
        entityLabel: pickLabel({ ...row, ...patch }) ?? pickLabel(row),
        changes: changed,
      });
    } else if (mutation.name === "upsert") {
      for (const row of payloadRows.slice(0, 20)) {
        await insertLog({ admin, action: "update", entityType: table, entityLabel: pickLabel(row), changes: snapshot(row) });
      }
    }
  } catch (err) {
    console.error("[audit] failed to record", table, err);
  }
  return result;
}

/** Wraps `from(table)` so that mutations are recorded. Reads pass through untouched. */
function trackBuilder<T extends object>(builder: T, table: string, calls: Call[]): T {
  return new Proxy(builder, {
    get(target, prop) {
      if (prop === "then") {
        const hasMutation = calls.some((c) => MUTATIONS.has(c.name));
        if (!hasMutation) return Reflect.get(target, prop, target);
        return (onFulfilled?: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
          runAndRecord(target as unknown as PromiseLike<unknown>, table, calls).then(onFulfilled, onRejected);
      }
      const value = Reflect.get(target, prop, target);
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        const out = value.apply(target, args);
        const next = [...calls, { name: String(prop), args }];
        if (out === target) return trackBuilder(target, table, next);
        if (out && typeof out === "object" && typeof (out as { then?: unknown }).then === "function") {
          return trackBuilder(out as object, table, next);
        }
        return out;
      };
    },
  });
}

export function withAudit(client: SupabaseClient): SupabaseClient {
  return new Proxy(client, {
    get(target, prop) {
      const value = Reflect.get(target, prop, target);
      if (prop !== "from" || typeof value !== "function") return value;
      return (table: string) => {
        const qb = (value as (t: string) => object).call(target, table);
        if (SKIP_TABLES.has(table)) return qb;
        return new Proxy(qb, {
          get(qbTarget, qbProp) {
            const method = Reflect.get(qbTarget, qbProp, qbTarget);
            if (typeof method !== "function" || !MUTATIONS.has(String(qbProp))) return method;
            return (...args: unknown[]) => {
              const out = method.apply(qbTarget, args);
              return trackBuilder(out as object, table, [{ name: String(qbProp), args }]);
            };
          },
        });
      };
    },
  });
}
