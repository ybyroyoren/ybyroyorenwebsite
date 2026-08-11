"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import styles from "@/app/admin/admin.module.css";

export interface SearchableItem {
  key: string;
  searchText: string;
  node: ReactNode;
}

function useFilteredItems(items: SearchableItem[], query: string) {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.searchText.toLowerCase().includes(q));
  }, [items, query]);
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className={styles.searchBar}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

export function AdminSearchTable({
  head,
  rows,
  colSpan,
  emptyMessage,
  placeholder = "חיפוש...",
}: {
  head: ReactNode;
  rows: SearchableItem[];
  colSpan: number;
  emptyMessage: string;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = useFilteredItems(rows, query);

  return (
    <div className={styles.card} style={{ overflowX: "auto" }}>
      <SearchInput value={query} onChange={setQuery} placeholder={placeholder} />
      <table className={styles.table}>
        <thead>{head}</thead>
        <tbody>
          {filtered.map((item) => (
            <Fragment key={item.key}>{item.node}</Fragment>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={colSpan} className={styles.muted}>
                {query ? "אין תוצאות תואמות." : emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function AdminSearchGrid({
  items,
  emptyMessage,
  placeholder = "חיפוש...",
  minColumnWidth = 260,
}: {
  items: SearchableItem[];
  emptyMessage: string;
  placeholder?: string;
  minColumnWidth?: number;
}) {
  const [query, setQuery] = useState("");
  const filtered = useFilteredItems(items, query);

  return (
    <>
      <SearchInput value={query} onChange={setQuery} placeholder={placeholder} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fill, minmax(${minColumnWidth}px, 1fr))`,
          gap: 14,
          marginTop: 16,
        }}
      >
        {filtered.map((item) => (
          <Fragment key={item.key}>{item.node}</Fragment>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className={styles.muted} style={{ marginTop: 16 }}>
          {query ? "אין תוצאות תואמות." : emptyMessage}
        </p>
      )}
    </>
  );
}
