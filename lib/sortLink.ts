export type SortDir = "asc" | "desc";

export interface SortParams {
  sort?: string;
  dir?: string;
}

export function sortHref(current: SortParams, field: string): string {
  const nextDir: SortDir = current.sort === field && current.dir === "asc" ? "desc" : "asc";
  return `?sort=${field}&dir=${nextDir}`;
}

export function sortArrow(current: SortParams, field: string): string {
  if (current.sort !== field) return "";
  return current.dir === "desc" ? " ↓" : " ↑";
}

export function sortRows<T>(rows: T[], current: SortParams, getters: Record<string, (row: T) => string | number | null>): T[] {
  const getter = current.sort ? getters[current.sort] : undefined;
  if (!getter) return rows;
  const dir = current.dir === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const va = getter(a);
    const vb = getter(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
    return String(va).localeCompare(String(vb), "he") * dir;
  });
}
