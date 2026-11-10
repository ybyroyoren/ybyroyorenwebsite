import styles from "@/app/admin/admin.module.css";

/**
 * "Move earlier / later" buttons for one item of an ordered list. Each button is its
 * own form posting to a server action with the item's id, the full current order
 * (so the action rewrites positions from what the admin actually sees) and the direction.
 * `layout="row"` is for thumbnails laid out side by side (arrows ← →, right-to-left page).
 */
export function OrderButtons({
  action,
  id,
  order,
  extra,
  isFirst,
  isLast,
  label,
  layout = "column",
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  order: string;
  extra?: Record<string, string>;
  isFirst: boolean;
  isLast: boolean;
  label: string;
  layout?: "column" | "row";
}) {
  const glyph = {
    up: layout === "row" ? "→" : "↑",
    down: layout === "row" ? "←" : "↓",
  };
  const text = {
    up: layout === "row" ? "הזזה אחורה (מוקדם יותר)" : "הזזה למעלה",
    down: layout === "row" ? "הזזה קדימה (מאוחר יותר)" : "הזזה למטה",
  };
  return (
    <div className={styles.orderButtons}>
      {(["up", "down"] as const).map((direction) => (
        <form key={direction} action={action}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="order" value={order} />
          <input type="hidden" name="direction" value={direction} />
          {Object.entries(extra ?? {}).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <button
            type="submit"
            className={styles.orderBtn}
            disabled={direction === "up" ? isFirst : isLast}
            aria-label={`${text[direction]}: ${label}`}
          >
            {glyph[direction]}
          </button>
        </form>
      ))}
    </div>
  );
}
