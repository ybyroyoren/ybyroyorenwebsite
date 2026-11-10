/**
 * Moves `id` one step earlier ("up") or later ("down") inside `order` — the
 * ids exactly as the admin page lists them — and returns the new list, or
 * null when there is nothing to move.
 */
export function movedOrder(order: string[], id: string, direction: string): string[] | null {
  const i = order.indexOf(id);
  const j = direction === "up" ? i - 1 : direction === "down" ? i + 1 : -1;
  if (i < 0 || j < 0 || j >= order.length) return null;
  const next = [...order];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export const parseIds = (raw: FormDataEntryValue | null): string[] =>
  String(raw ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
