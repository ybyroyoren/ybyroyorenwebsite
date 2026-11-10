import { allergenLabel, tagTextColor, type AllergenTag } from "@/lib/allergenTags";
import type { Locale } from "@/lib/dictionary";
import styles from "./AllergenTags.module.css";

/** The product's allergen tags as small colored pills (each tag's color is chosen by the owner). */
export function AllergenTags({
  tags,
  locale,
  label,
  size = "sm",
}: {
  tags: AllergenTag[];
  locale: Locale;
  /** Accessible name for the group, e.g. "Allergens". */
  label: string;
  size?: "sm" | "md";
}) {
  if (tags.length === 0) return null;
  return (
    <ul className={`${styles.tags} ${size === "md" ? styles.md : ""}`} aria-label={label}>
      {tags.map((tag) => (
        <li key={tag.id} className={styles.tag} style={{ background: tag.color, color: tagTextColor(tag.color) }}>
          {allergenLabel(tag, locale)}
        </li>
      ))}
    </ul>
  );
}
