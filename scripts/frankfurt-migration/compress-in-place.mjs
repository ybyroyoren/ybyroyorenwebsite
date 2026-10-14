// Shrinks the oversized images that the LIVE site serves right now, in the
// current (old) project, without waiting for the migration. Same path, same
// format, so no database change is needed. Originals are saved locally first,
// and a file is only overwritten once its backup is on disk.
//
//   node compress-in-place.mjs --backup <dir>            report only
//   node compress-in-place.mjs --backup <dir> --apply    overwrite for real
//   options: --max-dim 1800  --quality 82
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { loadOld, http, mb } from "./common.mjs";
import { walk, referencedPaths, compressImage, encodePath } from "./images.mjs";

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const apply = args.includes("--apply");
const backupDir = opt("--backup", null);
if (!backupDir) { console.error("--backup <dir> is required (originals are never overwritten without a local copy)"); process.exit(1); }
const maxDim = Number(opt("--max-dim", 1800)), quality = Number(opt("--quality", 82));

const old = loadOld();
const refs = await referencedPaths(old);
const objects = (await walk(old, "images")).filter((o) => refs.has(`${o.bucket}/${o.path}`));
let before = 0, after = 0, changed = 0;
for (const o of objects) {
  const res = await http(old, "GET", `/storage/v1/object/${o.bucket}/${encodePath(o.path)}`);
  const original = Buffer.from(await res.arrayBuffer());
  const mime = o.mime || res.headers.get("content-type") || "";
  const { buf, ext, kept } = await compressImage(original, mime, { maxDim, quality });
  // In place means same path: only JPEG->JPEG / PNG->PNG, never a format change.
  const sameFormat = ext && ((ext === "jpg" && mime === "image/jpeg") || (ext === "png" && mime === "image/png"));
  if (!sameFormat) { console.log(`  keep  ${o.path} (${mb(original.length)}, ${ext ? "would change format" : kept})`); before += original.length; after += original.length; continue; }
  before += original.length; after += buf.length;
  console.log(`  ${apply ? "shrink" : "would shrink"}  ${o.path}: ${mb(original.length)} -> ${mb(buf.length)}`);
  if (!apply) continue;
  const backupPath = path.join(backupDir, o.bucket, o.path);
  mkdirSync(path.dirname(backupPath), { recursive: true });
  writeFileSync(backupPath, original);
  if (!existsSync(backupPath)) throw new Error("backup failed, aborting before overwriting " + o.path);
  await http(old, "POST", `/storage/v1/object/${o.bucket}/${encodePath(o.path)}`, {
    headers: { "Content-Type": mime, "x-upsert": "true", "cache-control": "max-age=31536000" },
    body: buf,
  });
  changed++;
}
console.log(`\n${mb(before)} -> ${mb(after)} across ${objects.length} referenced images (${(100 - (after / before) * 100).toFixed(1)}% smaller).${apply ? ` Overwrote ${changed}; originals in ${backupDir}` : " DRY RUN — pass --apply to overwrite."}`);
