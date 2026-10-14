// Copies the database rows from the OLD project to the NEW one (REST only).
// Idempotent: rows are upserted by primary key, so it is safe to run
// repeatedly — once as a rehearsal, again right before the cutover, and once
// more right after to catch anything written to the old project meanwhile.
//
//   node copy-data.mjs --dry-run   show what would be copied, write nothing
//   node copy-data.mjs             upsert everything
//   node copy-data.mjs --mirror    also delete rows from the NEW project that
//                                  no longer exist in the old one (use for the
//                                  final pre-cutover sync)
//   node copy-data.mjs --only-missing
//                                  copy ONLY rows the new project doesn't have
//                                  yet and never touch existing ones. Use this
//                                  after the cutover to catch rows written to
//                                  the old project during the switch — a normal
//                                  run would overwrite rows that the live site
//                                  has already updated in the new project.
//
// Storage URLs inside rows are rewritten from the old project to the new one,
// applying .state/storage-map.json for images whose path changed.
import { loadOld, loadNew, http, fetchAll, TABLES, keptCartIds, chunk, makeRewriter } from "./common.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const mirror = args.includes("--mirror");
const onlyMissing = args.includes("--only-missing");
if (mirror && onlyMissing) { console.error("--mirror and --only-missing can't be combined"); process.exit(1); }

const old = loadOld();
const target = dryRun ? null : loadNew();
const newUrl = dryRun ? "https://NEW-PROJECT.supabase.co" : target.url;

const rewrite = makeRewriter(old, newUrl);

const source = {};
for (const t of TABLES) source[t] = await fetchAll(old, t);
const keep = keptCartIds(source.carts, source.cart_items, source.orders);
source.carts = source.carts.filter((c) => keep.has(c.id));
source.cart_items = source.cart_items.filter((i) => keep.has(i.cart_id));

// admin_profiles can only be copied once the matching auth users exist in the
// new project (see auth-export.sql).
let authIds = null;
if (!dryRun) {
  const res = await http(target, "GET", "/auth/v1/admin/users?per_page=1000");
  authIds = new Set(((await res.json()).users ?? []).map((u) => u.id));
}

let failures = 0;
for (const t of TABLES) {
  let rows = rewrite(source[t]);
  if (t === "admin_profiles" && authIds) {
    const missing = rows.filter((r) => !authIds.has(r.id));
    if (missing.length) console.log(`  ! admin_profiles: ${missing.length} profile(s) skipped — their login user isn't in the new project yet (run auth-export.sql steps)`);
    rows = rows.filter((r) => authIds.has(r.id));
  }
  if (dryRun) { console.log(`${t.padEnd(26)} ${String(rows.length).padStart(5)} rows`); continue; }

  // Seeded rows (categories) can carry different ids than the originals.
  if (mirror || t === "categories") {
    const existing = await fetchAll(target, t);
    const keepIds = new Set(rows.map((r) => r.id));
    const extra = existing.filter((r) => !keepIds.has(r.id));
    // Children first would matter for FKs, but a mirror only deletes rows the
    // old project no longer has; cascade rules in the schema handle the rest.
    for (const group of chunk(extra.map((r) => r.id), 50)) {
      await http(target, "DELETE", `/rest/v1/${t}?id=in.(${group.join(",")})`);
    }
    if (extra.length) console.log(`  ${t}: removed ${extra.length} stale row(s) from the new project`);
  }

  if (onlyMissing) {
    const have = new Set((await fetchAll(target, t)).map((r) => r.id));
    const missing = rows.filter((r) => !have.has(r.id));
    // A row can be "missing" by id yet clash with a newer row on a unique key
    // (e.g. the same seat re-created after the switch). The new project wins,
    // so such rows are skipped individually instead of failing the batch.
    let added = 0, skippedConflicts = 0;
    try {
      for (const row of missing) {
        const res = await http(target, "POST", `/rest/v1/${t}?on_conflict=id`, {
          headers: { "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" },
          body: JSON.stringify([row]),
          allow: [409],
        });
        if (res.status === 409) skippedConflicts++; else added++;
      }
      console.log(`${t.padEnd(26)} ${added || skippedConflicts ? `added ${added}${skippedConflicts ? `, skipped ${skippedConflicts} that conflict with newer rows` : ""}` : "nothing missing"}`);
    } catch (e) { console.log(`${t.padEnd(26)} FAILED: ${e.message}`); failures++; }
    continue;
  }

  try {
    for (const group of chunk(rows, 200)) {
      await http(target, "POST", `/rest/v1/${t}?on_conflict=id`, {
        headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(group),
      });
    }
    const after = (await fetchAll(target, t)).length;
    console.log(`${t.padEnd(26)} source ${String(rows.length).padStart(5)} -> new ${String(after).padStart(5)} ${after === rows.length ? "OK" : "MISMATCH"}`);
    if (after !== rows.length) failures++;
  } catch (e) {
    console.log(`${t.padEnd(26)} FAILED: ${e.message}`);
    failures++;
  }
}
console.log(dryRun ? "\nDRY RUN — nothing was written." : failures ? `\n${failures} table(s) need attention.` : "\nAll tables copied.");
process.exit(failures ? 1 : 0);
