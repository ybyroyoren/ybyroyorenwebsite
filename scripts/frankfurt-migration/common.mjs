// Shared helpers for the Singapore -> Frankfurt Supabase migration scripts.
//
// OLD project: read from .env.local (the live site's current project).
// NEW project: read from .env.migration (written by setup-env.sh).
// Keys are never printed. The scripts only ever WRITE to the NEW project —
// the single, explicit exception is compress-in-place.mjs (needs --apply).
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const STATE_DIR = path.join(ROOT, "scripts/frankfurt-migration/.state");

function parseEnv(file) {
  if (!existsSync(file)) return null;
  const env = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const i = line.indexOf("=");
    if (i > 0 && !line.trim().startsWith("#")) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

function project(name, url, key) {
  if (!url || !key) throw new Error(`Missing URL/service key for the ${name} project.`);
  const base = url.replace(/\/+$/, "");
  return {
    name,
    url: base,
    host: new URL(base).host,
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    publicBase: `${base}/storage/v1/object/public/`,
  };
}

export function loadOld() {
  const env = parseEnv(path.join(ROOT, ".env.local"));
  if (!env) throw new Error(".env.local not found");
  return project("old", env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

export function loadNew() {
  const env = parseEnv(path.join(ROOT, ".env.migration"));
  if (!env) throw new Error(".env.migration not found — run: bash scripts/frankfurt-migration/setup-env.sh");
  const p = project("new", env.NEW_SUPABASE_URL, env.NEW_SUPABASE_SERVICE_ROLE_KEY);
  if (p.host === loadOld().host) throw new Error("NEW and OLD point at the same project — refusing to continue.");
  return p;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** fetch with retries on network errors, 429 and 5xx. Returns the Response. */
export async function http(proj, method, pathname, { body, headers = {}, allow = [] } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(`${proj.url}${pathname}`, { method, headers: { ...proj.headers, ...headers }, body });
      if (res.ok || allow.includes(res.status)) return res;
      if (res.status < 500 && res.status !== 429) {
        throw Object.assign(new Error(`${method} ${pathname.split("?")[0]} -> ${res.status}: ${(await res.text()).slice(0, 300)}`), { fatal: true });
      }
      lastErr = new Error(`${method} ${pathname.split("?")[0]} -> ${res.status}`);
    } catch (e) {
      if (e.fatal) throw e;
      lastErr = e;
    }
    await sleep(500 * attempt);
  }
  throw lastErr;
}

export async function fetchAll(proj, table, { order = "id" } = {}) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const res = await http(proj, "GET", `/rest/v1/${table}?select=*&order=${order}.asc`, {
      headers: { Range: `${from}-${from + 999}`, "Range-Unit": "items" },
      allow: [206],
    });
    const page = await res.json();
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
}

// Dependency order: parents before children. admin_profiles last because it
// needs the auth users to exist in the new project first.
export const TABLES = [
  "categories", "products", "product_sizes", "coupons",
  "carts", "cart_items", "orders", "order_items",
  "meals", "meal_registrations", "meal_diners",
  "newsletter_subscribers", "contact_messages", "event_inquiries", "notification_recipients", "site_media",
  "kl_suppliers", "kl_equipment", "kl_guests", "kl_ingredients", "kl_recipes", "kl_recipe_components",
  "kl_events", "kl_event_menu", "kl_event_guest_seats", "kl_event_completed_items",
  "admin_profiles",
];

/**
 * Empty carts are bot/visitor noise (the old code created a cart row per page
 * view); only carts that hold items or that an order points at are worth
 * carrying over.
 */
export function keptCartIds(carts, cartItems, orders) {
  const keep = new Set(cartItems.map((i) => i.cart_id));
  for (const o of orders) if (o.cart_id) keep.add(o.cart_id);
  return new Set(carts.filter((c) => keep.has(c.id)).map((c) => c.id));
}

export function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export const mb = (bytes) => (bytes / 1048576).toFixed(2) + " MB";

/**
 * Rewrites storage URLs inside rows from the old project to the new one,
 * applying .state/storage-map.json for images whose path changed on the way.
 */
export function makeRewriter(oldProj, newUrl) {
  const mapFile = path.join(STATE_DIR, "storage-map.json");
  const storageMap = existsSync(mapFile) ? JSON.parse(readFileSync(mapFile, "utf8")) : {};
  const newBase = `${newUrl}/storage/v1/object/public/`;
  return (rows) => {
    let text = JSON.stringify(rows);
    for (const [from, to] of Object.entries(storageMap)) text = text.replaceAll(oldProj.publicBase + from, newBase + to);
    return JSON.parse(text.replaceAll(oldProj.publicBase, newBase));
  };
}
