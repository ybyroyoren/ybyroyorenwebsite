#!/usr/bin/env node
// Read-only. Exports every ingredient price and every recipe / event cost as the site computes them
// (JSON + CSV files), and optionally a raw backup of the kitchen tables.
//
//   node scripts/kitchen-cost/snapshot.mjs <out-dir>             -> <out-dir>/baseline-<stamp>.json (+ csv)
//   node scripts/kitchen-cost/snapshot.mjs <out-dir> --backup    -> also <out-dir>/backup-<stamp>.json
//   node scripts/kitchen-cost/snapshot.mjs compare <baseline.json> -> compares the current costs with a baseline
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const env = fs.readFileSync(path.join(root, ".env.local"), "utf8");
for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]) {
  process.env[k] ??= env.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1]?.trim();
}
process.env.NODE_ENV = "test"; // audit wrapper stays inert

const stub = (name, code) => ({
  name,
  setup(b) {
    b.onResolve({ filter: new RegExp(`^${name}$`) }, () => ({ path: name, namespace: "stub" }));
    b.onLoad({ filter: /.*/, namespace: "stub" }, (a) => (a.path === name ? { contents: code, loader: "js" } : null));
  },
});

async function loadSnapshot() {
  const outfile = path.join(os.tmpdir(), `kitchen-snapshot-${process.pid}.mjs`);
  await build({
    entryPoints: [path.join(root, "scripts/kitchen-cost/entry.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile,
    alias: { "@": root },
    nodePaths: [path.join(root, "node_modules")],
    external: ["@supabase/supabase-js", "@supabase/ssr"],
    plugins: [
      stub("server-only", ""),
      stub("react", "export const cache = (f) => f;"),
      stub("next/headers", "export const cookies = async () => ({ getAll: () => [] }); export const headers = async () => new Map();"),
    ],
    logLevel: "error",
  });
  // the bundle imports @supabase/* from this project
  const code = fs.readFileSync(outfile, "utf8");
  const localCopy = path.join(root, "scripts/kitchen-cost/.snapshot-bundle.mjs");
  fs.writeFileSync(localCopy, code);
  try {
    const mod = await import(localCopy);
    return await mod.buildSnapshot();
  } finally {
    fs.rmSync(localCopy, { force: true });
    fs.rmSync(outfile, { force: true });
  }
}

const stamp = () => new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const csv = (header, rows) => "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");

async function backupTables(file) {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const tables = ["kl_suppliers", "kl_equipment", "kl_guests", "kl_ingredients", "kl_recipes", "kl_recipe_components", "kl_events", "kl_event_menu", "kl_event_guest_seats", "kl_event_completed_items", "kl_invoice_items"];
  const out = {};
  for (const t of tables) {
    const rows = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from(t).select("*").range(from, from + 999);
      if (error) {
        if (/does not exist|schema cache/.test(error.message)) break; // table not created yet
        throw new Error(`${t}: ${error.message}`);
      }
      rows.push(...data);
      if (data.length < 1000) break;
    }
    out[t] = rows;
  }
  fs.writeFileSync(file, JSON.stringify({ takenAt: new Date().toISOString(), tables: out }, null, 1));
  return Object.fromEntries(Object.entries(out).map(([t, r]) => [t, r.length]));
}

const [a, b, c] = process.argv.slice(2);

if (a === "compare") {
  const baseline = JSON.parse(fs.readFileSync(b, "utf8"));
  const now = await loadSnapshot();
  const TOL = 0.0001;
  const problems = [];
  for (const k of Object.keys(baseline.counts)) if (baseline.counts[k] !== now.counts[k]) problems.push(`count ${k}: ${baseline.counts[k]} -> ${now.counts[k]}`);
  const ingNow = new Map(now.ingredients.map((i) => [i.id, i]));
  for (const i of baseline.ingredients) {
    const n = ingNow.get(i.id);
    if (!n) problems.push(`ingredient missing: ${i.name}`);
    else if ((i.price === null) !== (n.price === null) || (i.price !== null && Math.abs(i.price - n.price) > 1e-9)) problems.push(`ingredient price ${i.name}: ${i.price} -> ${n.price}`);
    else if (i.yieldPercent !== n.yieldPercent) problems.push(`ingredient yield ${i.name}: ${i.yieldPercent} -> ${n.yieldPercent}`);
  }
  const recNow = new Map(now.recipes.map((r) => [r.id, r]));
  let lines = 0;
  for (const r of baseline.recipes) {
    const n = recNow.get(r.id);
    if (!n) { problems.push(`recipe missing: ${r.name}`); continue; }
    if (Math.abs(r.baseCost - n.baseCost) > TOL) problems.push(`recipe cost ${r.name}: ${r.baseCost} -> ${n.baseCost}`);
    if (r.partial !== n.partial) problems.push(`recipe partial flag ${r.name}: ${r.partial} -> ${n.partial}`);
    for (const l of r.lines) {
      lines++;
      const nl = n.lines.find((x) => x.componentId === l.componentId);
      if (!nl) problems.push(`line missing in ${r.name}: ${l.name}`);
      else if ((l.lineCost === null) !== (nl.lineCost === null) || (l.lineCost !== null && Math.abs(l.lineCost - nl.lineCost) > TOL)) problems.push(`line ${r.name} / ${l.name}: ${l.lineCost} -> ${nl.lineCost}`);
    }
  }
  const evNow = new Map(now.events.map((e) => [e.id, e]));
  for (const e of baseline.events) {
    const n = evNow.get(e.id);
    if (!n) problems.push(`event missing: ${e.name}`);
    else if (Math.abs(e.total - n.total) > TOL) problems.push(`event total ${e.name}: ${e.total} -> ${n.total}`);
  }
  console.log(`checked ${baseline.ingredients.length} ingredients, ${baseline.recipes.length} recipes (${lines} lines), ${baseline.events.length} events`);
  if (problems.length === 0) console.log("RESULT: no differences");
  else {
    console.log(`RESULT: ${problems.length} difference(s)`);
    for (const p of problems.slice(0, 40)) console.log(" -", p);
    process.exitCode = 1;
  }
} else {
  const outDir = path.resolve(a ?? ".");
  fs.mkdirSync(outDir, { recursive: true });
  const s = stamp();
  const snap = await loadSnapshot();
  const file = path.join(outDir, `baseline-${s}.json`);
  fs.writeFileSync(file, JSON.stringify({ takenAt: new Date().toISOString(), ...snap }, null, 1));
  const supplierless = (v) => (v === null ? "" : v);
  fs.writeFileSync(
    path.join(outDir, `baseline-${s}-ingredients.csv`),
    csv(["id", "name", "unit", "price", "yield_percent", "purchase_name", "purchase_unit"], snap.ingredients.map((i) => [i.id, i.name, i.unit, supplierless(i.price), supplierless(i.yieldPercent), i.purchaseName, i.purchaseUnit]))
  );
  fs.writeFileSync(
    path.join(outDir, `baseline-${s}-recipes.csv`),
    csv(["id", "name", "base_amount", "base_unit", "base_cost", "cost_per_base_unit", "partial"], snap.recipes.map((r) => [r.id, r.name, r.baseAmount, r.baseUnit, r.baseCost, r.costPerBaseUnit, r.partial ? "yes" : "no"]))
  );
  fs.writeFileSync(
    path.join(outDir, `baseline-${s}-events.csv`),
    csv(["id", "name", "date", "guest_count", "total_cost"], snap.events.map((e) => [e.id, e.name, e.date, e.guestCount, e.total]))
  );
  console.log("counts:", JSON.stringify(snap.counts));
  console.log("wrote", file, "+ 3 csv files");
  if (process.argv.includes("--backup")) {
    const counts = await backupTables(path.join(outDir, `backup-${s}.json`));
    console.log("backup rows:", JSON.stringify(counts));
  }
}
