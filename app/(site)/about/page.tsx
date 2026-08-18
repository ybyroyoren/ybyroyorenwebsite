import type { Metadata } from "next";
import { getMediaByLocation } from "@/lib/media";
import { getLocale } from "@/lib/i18n";
import { getDict } from "@/lib/dictionary";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "אודות" };

export default async function AboutPage() {
  const [[heroImage], locale] = await Promise.all([getMediaByLocation("about_hero"), getLocale()]);
  const t = getDict(locale).about;

  return (
    <div className={`wrap ${styles.hero}`}>
      <div>
        <div className={styles.eyebrow}>{t.eyebrow}</div>
        <h1>
          {t.heading[0]}
          <br />
          {t.heading[1]}
        </h1>
        <p>{t.body}</p>
      </div>
      <div className={`${styles.visual} ${heroImage ? styles.hasPhoto : ""}`}>
        {heroImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.photo} src={heroImage.url} alt={t.photoAlt} />
        )}
      </div>
    </div>
  );
}
