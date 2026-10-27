import type { CSSProperties } from "react";

/** Stagger index for the .enter / [data-reveal] animations (each step delays ~0.1s). */
export function stagger(index: number): CSSProperties {
  return { "--i": Math.min(index, 8) } as CSSProperties;
}
