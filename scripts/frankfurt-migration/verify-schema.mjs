// Compares the REST schema (tables, columns, types, nullability) exposed by
// the OLD and NEW projects. Run after applying supabase/frankfurt-schema.sql
// to the new project; any difference is printed.
import { loadOld, loadNew, TABLES } from "./common.mjs";

async function spec(p) {
  const res = await fetch(`${p.url}/rest/v1/`, { headers: { ...p.headers, Accept: "application/openapi+json" } });
  if (!res.ok) throw new Error(`${p.name}: ${res.status} fetching schema`);
  return (await res.json()).definitions ?? {};
}

const [a, b] = [await spec(loadOld()), await spec(loadNew())];
let problems = 0;
for (const name of [...TABLES, "meal_availability"]) {
  const x = a[name], y = b[name];
  if (!x || !y) { console.log(`✗ ${name}: missing in ${!x ? "old" : "new"} project`); problems++; continue; }
  const cols = new Set([...Object.keys(x.properties), ...Object.keys(y.properties)]);
  const diffs = [];
  for (const c of cols) {
    const p = x.properties[c], q = y.properties[c];
    if (!p || !q) diffs.push(`${c}: only in ${!p ? "new" : "old"}`);
    else if (p.format !== q.format || p.type !== q.type) diffs.push(`${c}: ${p.format ?? p.type} vs ${q.format ?? q.type}`);
  }
  const reqA = (x.required ?? []).sort().join(","), reqB = (y.required ?? []).sort().join(",");
  if (reqA !== reqB) diffs.push(`required columns differ (old: ${reqA} | new: ${reqB})`);
  if (diffs.length) { console.log(`✗ ${name}\n    ${diffs.join("\n    ")}`); problems++; }
}
console.log(problems ? `\n${problems} table(s) differ.` : `\n✓ Schema matches on all ${TABLES.length + 1} tables/views.`);
process.exit(problems ? 1 : 0);
