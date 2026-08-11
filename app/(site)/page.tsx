import Link from "next/link";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroMark}>Y</div>
      <div className={`wrap ${styles.inner}`}>
        <div className={styles.eyebrow}>שף פרטי - קייטרינג - חנות מוצרים - Y by Roy Oren</div>
        <h1>Y - בית ליצירה קולינרית</h1>
        <p className={styles.sub}>
          ארוחות אינטימיות, אירועים גדולים, ארוחות פתוחות אצלנו בחלל האירוח או חנות מוצרים מעשה
          ידינו. אנחנו פה בשבילכם.
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
