"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import styles from "@/app/admin/admin.module.css";

export interface SearchOption {
  value: string;
  label: string;
  /** Small tag shown next to the option, e.g. "raw ingredient" / "recipe". */
  badge?: string;
}

const MAX_RESULTS = 60;

function normalize(text: string): string {
  return text.toLowerCase().replace(/["״׳']/g, "").trim();
}

/**
 * A text box that suggests options while you type: every option whose text contains what was typed (anywhere,
 * every typed word) is listed, best matches first. Pick with the mouse, or ↑ ↓ and Enter. Replaces a long
 * <select> that had to be scrolled.
 */
export function SearchSelect({
  options,
  value,
  onChange,
  placeholder = "הקלידו לחיפוש...",
  ariaLabel,
  style,
}: {
  options: SearchOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  style?: React.CSSProperties;
}) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const selected = options.find((o) => o.value === value);

  const results = useMemo(() => {
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    const matches = options
      .map((o) => ({ o, text: normalize(o.label) }))
      .filter(({ text }) => tokens.every((t) => text.includes(t)));
    const first = tokens[0] ?? "";
    matches.sort((a, b) => {
      const aStart = first && a.text.startsWith(first) ? 0 : 1;
      const bStart = first && b.text.startsWith(first) ? 0 : 1;
      return aStart - bStart || a.o.label.localeCompare(b.o.label, "he");
    });
    return matches.slice(0, MAX_RESULTS).map((m) => m.o);
  }, [options, query]);

  // Close when clicking elsewhere.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function pick(option: SearchOption) {
    onChange(option.value);
    setOpen(false);
    setQuery("");
    setActive(0);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && results[active]) {
        e.preventDefault();
        pick(results[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className={styles.searchSelect} style={style}>
      <input
        type="text"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={open ? query : (selected?.label ?? "")}
        placeholder={selected ? selected.label : placeholder}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      {selected?.badge && !open && <span className={styles.searchBadge}>{selected.badge}</span>}
      {open && (
        <ul id={listId} role="listbox" className={styles.searchList}>
          {results.length === 0 && <li className={styles.searchEmpty}>לא נמצא כלום. אפשר לנסות מילה אחרת.</li>}
          {results.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={`${styles.searchItem} ${i === active ? styles.searchItemActive : ""}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault(); // keep focus so the click isn't lost to blur
                pick(o);
              }}
            >
              <span>{o.label}</span>
              {o.badge && <span className={styles.searchBadge}>{o.badge}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
