import Link from "next/link";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroMark}>Y</div>
      <div className={`wrap ${styles.inner}`}>
        <div className={styles.eyebrow}>שף פרטי · Roy Oren</div>
        <h1>
          ארוחה טובה
          <br />
          מתחילה <em>בשולחן שלך</em>.
        </h1>
        <p className={styles.sub}>
          הארוחה הפתוחה הקרובה מתמלאת — נשארו מקומות אחרונים. מוצרים ביתיים ואירועים פרטיים
          מחכים בהמשך.
        </p>
        <div className={styles.actions}>
          <Link className={`${styles.btn} ${styles.btnPrimary}`} href="/meals">
            שריינו מקום לארוחה הקרובה
          </Link>
          <Link className={`${styles.btn} ${styles.btnOutline}`} href="/shop">
            לחנות המוצרים
          </Link>
        </div>
        <Link className={styles.tertiary} href="/events">
          מתכננים אירוע פרטי? לחצו כאן ←
        </Link>
      </div>
      <div className={styles.scrollCue}>גלול/י</div>
    </section>
  );
}
