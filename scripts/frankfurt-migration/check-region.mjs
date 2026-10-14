// Which AWS region does each project's database live in? (Resolves the
// project's db host and matches the IP against AWS's published ranges.)
// Use it to confirm the NEW project really is in eu-central-1 (Frankfurt).
import dns from "node:dns/promises";
import { loadOld, loadNew } from "./common.mjs";

const ranges = await (await fetch("https://ip-ranges.amazonaws.com/ip-ranges.json")).json();
const v6 = (ip) => {
  const [head, tail = ""] = ip.split("::");
  const h = head ? head.split(":") : [];
  const t = tail ? tail.split(":") : [];
  return [...h, ...Array(8 - h.length - t.length).fill("0"), ...t].reduce((a, g) => (a << 16n) + BigInt(parseInt(g || "0", 16)), 0n);
};
const inV6 = (ip, cidr) => { const [n, b] = cidr.split("/"); const s = 128n - BigInt(b); return v6(ip) >> s === v6(n) >> s; };
const v4 = (ip) => ip.split(".").reduce((a, o) => (a << 8) + Number(o), 0) >>> 0;
const inV4 = (ip, cidr) => { const [n, b] = cidr.split("/"); const m = b === "0" ? 0 : (~0 << (32 - Number(b))) >>> 0; return (v4(ip) & m) === (v4(n) & m); };

async function region(proj) {
  const ref = proj.host.split(".")[0];
  const host = `db.${ref}.supabase.co`;
  const out = new Set();
  try { for (const ip of await dns.resolve6(host)) ranges.ipv6_prefixes.filter((p) => p.service === "EC2" && inV6(ip, p.ipv6_prefix)).forEach((p) => out.add(p.region)); } catch {}
  try { for (const ip of await dns.resolve4(host)) ranges.prefixes.filter((p) => p.service === "EC2" && inV4(ip, p.ip_prefix)).forEach((p) => out.add(p.region)); } catch {}
  return [...out].join(", ") || "unknown";
}

const which = process.argv[2];
const targets = which === "new" ? [loadNew()] : which === "old" ? [loadOld()] : [loadOld(), loadNew()];
for (const p of targets) console.log(`${p.name}: ${await region(p)}`);
