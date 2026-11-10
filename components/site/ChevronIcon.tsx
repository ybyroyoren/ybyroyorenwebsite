/**
 * Previous / next arrow for slider buttons. Drawn as an SVG on an exact grid
 * (not a "‹" "›" text glyph, whose font metrics sit off-center in a circle).
 * "prev" points toward the start of the reading direction and "next" toward
 * the end — mirrored automatically in right-to-left pages.
 */
export function ChevronIcon({ dir, size = 18 }: { dir: "prev" | "next"; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block" }}
      className="chevron"
    >
      <path d={dir === "prev" ? "M15 5 8 12l7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}
