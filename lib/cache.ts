import { revalidatePath, updateTag } from "next/cache";

// Cache tags for the public read paths (products, categories, site media,
// open meals). Public pages used to hit the database on every single request
// — a long round trip, since the database and the server aren't in the same
// region as the visitors — so those reads are cached (unstable_cache) and
// tagged here. Anything that changes the underlying data expires the tag
// (see the admin actions and the payment webhook) so edits still show up
// immediately; each cache also has a time-based fallback so a missed
// invalidation can only ever make content stale for minutes, not forever.
export const CACHE_TAGS = {
  products: "products",
  categories: "categories",
  media: "media",
  meals: "meals",
} as const;

// Call these from Server Actions (updateTag only works there) right after a
// write, so the very next visitor sees the change rather than a cached copy.
export function expireCatalog() {
  updateTag(CACHE_TAGS.products);
  updateTag(CACHE_TAGS.categories);
  revalidatePath("/shop");
  revalidatePath("/en/shop");
}

export function expireMeals() {
  updateTag(CACHE_TAGS.meals);
  revalidatePath("/meals");
  revalidatePath("/en/meals");
}

export function expireMedia() {
  updateTag(CACHE_TAGS.media);
}
