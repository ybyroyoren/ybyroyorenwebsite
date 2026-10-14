// Copies every image that the database actually references from the OLD
// project's storage to the NEW project's, compressing on the way:
//   - long edge capped (default 1800px), re-encoded as progressive JPEG
//   - EXIF rotation baked in, metadata stripped
//   - PNGs with transparency stay PNG; other PNGs become JPEG
//   - if recompressing doesn't save at least 10%, the original bytes are kept
// Object paths are preserved unless the format changed (.png -> .jpg); any
// renames are recorded in .state/storage-map.json and applied to database
// URLs by copy-data.mjs. Re-runnable: objects already present at the same
// size are skipped.
//
//   node copy-storage.mjs --dry-run            report savings, write nothing
//   node copy-storage.mjs --backup <dir>       also save untouched originals locally
//   node copy-storage.mjs                      compress + upload to the NEW project
//   options: --max-dim 1800  --quality 82  --include-orphans
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadOld, loadNew, http, STATE_DIR, mb } from "./common.mjs";
import { walk, referencedPaths, compressImage, encodePath } from "./images.mjs";

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const dryRun = flag("--dry-run");
const maxDim = Number(opt("--max-dim", 1800));
const quality = Number(opt("--quality", 82));
const backupDir = opt("--backup", null);
const includeOrphans = flag("--include-orphans");

const old = loadOld();
const target = dryRun ? null : loadNew();
const objects = await walk(old, "images");
const refs = await referencedPaths(old);
const wanted = objects.filter((o) => includeOrphans || refs.has(`${o.bucket}/${o.path}`));
const orphans = objects.filter((o) => !refs.has(`${o.bucket}/${o.path}`));
console.log(`${objects.length} objects in old storage (${mb(objects.reduce((s, o) => s + o.size, 0))}); ${wanted.length} referenced, ${orphans.length} orphaned${includeOrphans ? " (copying anyway)" : " (skipped)"}`);
if (orphans.length && !includeOrphans) for (const o of orphans) console.log(`  orphan: ${o.path} (${mb(o.size)})`);

const map = {};
let before = 0, after = 0, uploaded = 0, skipped = 0;
for (const o of wanted) {
  const res = await http(old, "GET", `/storage/v1/object/${o.bucket}/${encodePath(o.path)}`);
  const original = Buffer.from(await res.arrayBuffer());
  if (backupDir) {
    const dest = path.join(backupDir, o.bucket, o.path);
    mkdirSync(path.dirname(dest), { recursive: true });
    writeFileSync(dest, original);
  }
  const { buf, ext, kept } = await compressImage(original, o.mime || res.headers.get("content-type") || "", { maxDim, quality });
  const sameFormat = (ext === "jpg" && /\.jpe?g$/i.test(o.path)) || (ext === "png" && /\.png$/i.test(o.path));
  const newPath = ext && !sameFormat ? o.path.replace(/\.[^./]+$/, "") + "." + ext : o.path;
  const contentType = ext === "jpg" ? "image/jpeg" : ext === "png" ? "image/png" : o.mime || "application/octet-stream";
  if (newPath !== o.path) map[`${o.bucket}/${o.path}`] = `${o.bucket}/${newPath}`;
  before += original.length;
  after += buf.length;
  const note = ext ? `${mb(original.length)} -> ${mb(buf.length)}` : `kept ${mb(original.length)} (${kept})`;
  let status = "";
  if (!dryRun) {
    const head = await fetch(`${target.publicBase}${o.bucket}/${encodePath(newPath)}`, { method: "HEAD" });
    if (head.ok && Number(head.headers.get("content-length")) === buf.length) { skipped++; status = " [already there]"; }
    else {
      await http(target, "POST", `/storage/v1/object/${o.bucket}/${encodePath(newPath)}`, {
        headers: { "Content-Type": contentType, "x-upsert": "true", "cache-control": "max-age=31536000" },
        body: buf,
      });
      uploaded++;
      status = " [uploaded]";
    }
  }
  console.log(`  ${o.path}: ${note}${status}`);
}

mkdirSync(STATE_DIR, { recursive: true });
writeFileSync(path.join(STATE_DIR, "storage-map.json"), JSON.stringify(map, null, 2));
console.log(`\nTotal: ${mb(before)} -> ${mb(after)} (${(100 - (after / before) * 100).toFixed(1)}% smaller). Renamed paths: ${Object.keys(map).length}.${dryRun ? " DRY RUN — nothing was written." : ` Uploaded ${uploaded}, skipped ${skipped}.`}`);
