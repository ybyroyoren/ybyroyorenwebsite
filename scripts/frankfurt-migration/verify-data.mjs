// Row-by-row comparison of the OLD and NEW projects (after URL rewriting),
// plus: every storage URL in the new database must actually load, nothing may
// still point at the old project, and the admin login users must exist.
import { loadOld, loadNew, http, fetchAll, TABLES, keptCartIds, makeRewriter } from "./common.mjs";

const old = loadOld(), neu = loadNew();
const rewrite = makeRewriter(old, neu.url);
const canon = (v) => JSON.stringify(v, (_, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([k], [l]) => (k < l ? -1 : 1))) : x));

const src = {}, dst = {};
for (const t of TABLES) { src[t] = await fetchAll(old, t); dst[t] = await fetchAll(neu, t); }
const keep = keptCartIds(src.carts, src.cart_items, src.orders);
src.carts = src.carts.filter((c) => keep.has(c.id));
src.cart_items = src.cart_items.filter((i) => keep.has(i.cart_id));

let problems = 0;
for (const t of TABLES) {
  const want = new Map(rewrite(src[t]).map((r) => [r.id, canon(r)]));
  const have = new Map(dst[t].map((r) => [r.id, canon(r)]));
  const missing = [...want.keys()].filter((id) => !have.has(id));
  const extra = [...have.keys()].filter((id) => !want.has(id));
  const differing = [...want.keys()].filter((id) => have.has(id) && have.get(id) !== want.get(id));
  const ok = !missing.length && !differing.length && !extra.length;
  if (t === "admin_profiles" && missing.length && !differing.length && !extra.length) {
    console.log(`~ ${t.padEnd(26)} ${missing.length} profile(s) waiting for their login user to be imported`);
    problems++;
    continue;
  }
  console.log(`${ok ? "✓" : "✗"} ${t.padEnd(26)} ${want.size} expected, ${have.size} found${ok ? "" : `  (missing ${missing.length}, extra ${extra.length}, different ${differing.length})`}`);
  if (!ok) problems++;
}

// Storage: every referenced file loads from the new project; no old URLs left.
const allText = JSON.stringify(dst);
const urls = [...new Set([...allText.matchAll(new RegExp(neu.publicBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[^\"\\s)]+", "g"))].map((m) => m[0]))];
let bad = 0;
for (const u of urls) {
  const r = await fetch(u, { method: "HEAD" });
  if (!r.ok || !(r.headers.get("content-type") ?? "").startsWith("image/")) { console.log(`✗ image not loading: ${u} (${r.status})`); bad++; }
}
console.log(`${bad ? "✗" : "✓"} storage: ${urls.length - bad}/${urls.length} referenced images load from the new project`);
if (bad) problems++;
const leftovers = allText.includes(old.host);
console.log(`${leftovers ? "✗" : "✓"} no database row still points at the old project`);
if (leftovers) problems++;

// Auth users: same ids and emails on both sides.
const users = async (p) => ((await (await http(p, "GET", "/auth/v1/admin/users?per_page=1000")).json()).users ?? []).map((u) => `${u.id}:${u.email}`).sort();
const [ua, ub] = [await users(old), await users(neu)];
const authOk = ua.join("|") === ub.join("|");
console.log(`${authOk ? "✓" : "✗"} login users: ${ua.length} in old, ${ub.length} in new${authOk ? "" : " — import them with auth-export.sql"}`);
if (!authOk) problems++;

console.log(problems ? `\n${problems} check(s) need attention.` : "\n✓ Everything matches.");
process.exit(problems ? 1 : 0);
