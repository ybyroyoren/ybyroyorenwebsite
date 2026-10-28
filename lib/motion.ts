import type { CSSProperties } from "react";

/** Stagger index for the .enter / [data-reveal] animations (each step delays ~0.1s). */
export function stagger(index: number): CSSProperties {
  return { "--i": Math.min(index, 8) } as CSSProperties;
}

/**
 * False when the visitor (or their device) asked for less motion — via the OS
 * setting or the site's own accessibility widget. Browser only.
 */
export function motionAllowed(): boolean {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  return document.documentElement.getAttribute("data-a11y-stop-animations") !== "true";
}
