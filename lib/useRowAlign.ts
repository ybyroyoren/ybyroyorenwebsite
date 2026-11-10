"use client";

import { useLayoutEffect, type RefObject } from "react";

const PARTS = ["name", "desc", "allergens", "size"] as const;

/**
 * Lines up the parts of grid cards (children of `gridRef`, each with
 * `data-part="name|desc|allergens|size"` elements) across every visual row.
 * The CSS (subgrid) does this natively; browsers without subgrid — older
 * Chrome and Safari — get this fallback instead: for each row of cards every
 * part gets the height of the tallest one.
 */
export function useRowAlign(gridRef: RefObject<HTMLElement | null>, deps: unknown[]) {
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    if (typeof CSS !== "undefined" && CSS.supports("grid-template-rows", "subgrid")) return;

    let frame: number | null = null;
    const align = () => {
      frame = null;
      const cards = Array.from(grid.children) as HTMLElement[];
      for (const card of cards) {
        for (const part of PARTS) {
          const el = card.querySelector<HTMLElement>(`[data-part="${part}"]`);
          if (el) el.style.minHeight = "";
        }
      }
      const rows = new Map<number, HTMLElement[]>();
      for (const card of cards) {
        const top = Math.round(card.offsetTop);
        rows.set(top, [...(rows.get(top) ?? []), card]);
      }
      for (const row of rows.values()) {
        for (const part of PARTS) {
          const els = row.flatMap((c) => c.querySelector<HTMLElement>(`[data-part="${part}"]`) ?? []);
          const tallest = Math.max(0, ...els.map((e) => e.offsetHeight));
          for (const e of els) e.style.minHeight = `${tallest}px`;
        }
      }
    };
    const schedule = () => {
      if (frame === null) frame = requestAnimationFrame(align);
    };

    align();
    const observer = new ResizeObserver(schedule);
    observer.observe(grid);
    window.addEventListener("resize", schedule);
    document.fonts?.ready.then(schedule);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      if (frame !== null) cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
