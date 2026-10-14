// Image helpers shared by copy-storage.mjs and compress-in-place.mjs.
import sharp from "sharp";
import { http, fetchAll, TABLES } from "./common.mjs";

export const encodePath = (p) => p.split("/").map(encodeURIComponent).join("/");

export async function walk(proj, bucket, prefix = "") {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const res = await http(proj, "POST", `/storage/v1/object/list/${bucket}`, {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: "name", order: "asc" } }),
    });
    const items = await res.json();
    for (const it of items) {
      const p = prefix ? `${prefix}/${it.name}` : it.name;
      if (it.id === null) out.push(...(await walk(proj, bucket, p)));
      else out.push({ bucket, path: p, size: it.metadata?.size ?? 0, mime: it.metadata?.mimetype ?? "" });
    }
    if (items.length < 1000) break;
  }
  return out;
}

/** Storage paths ("bucket/path") that some database row actually points at. */
export async function referencedPaths(proj) {
  const refs = new Set();
  const re = new RegExp(proj.publicBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^/\"\\s)]+)/([^\"\\s)]+)", "g");
  for (const t of TABLES.filter((t) => t !== "admin_profiles")) {
    const text = JSON.stringify(await fetchAll(proj, t));
    for (const m of text.matchAll(re)) refs.add(`${m[1]}/${decodeURIComponent(m[2])}`);
  }
  return refs;
}

/**
 * Long edge capped at maxDim, EXIF rotation baked in, metadata stripped,
 * progressive mozjpeg. PNGs with transparency stay PNG; other PNGs become
 * JPEG. Returns { buf, ext } or { buf: original, ext: null, kept: reason } when
 * recompressing wouldn't save at least 10%.
 */
export async function compressImage(buf, mime, { maxDim = 1800, quality = 82 } = {}) {
  if (!/^image\/(jpeg|png|webp)$/.test(mime)) return { buf, ext: null, kept: "unsupported type" };
  const base = () => sharp(buf, { failOn: "none" });
  const meta = await base().metadata();
  const img = base().rotate().resize({ width: maxDim, height: maxDim, fit: "inside", withoutEnlargement: true });
  let out, ext;
  if (mime === "image/png" && meta.hasAlpha) { out = await img.png({ compressionLevel: 9, palette: true }).toBuffer(); ext = "png"; }
  else { out = await img.jpeg({ quality, mozjpeg: true, progressive: true }).toBuffer(); ext = "jpg"; }
  if (out.length > buf.length * 0.9) return { buf, ext: null, kept: "already small" };
  return { buf: out, ext };
}
