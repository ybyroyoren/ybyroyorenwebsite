import styles from "./LegalLayout.module.css";

export function LegalLayout({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`wrap ${styles.page}`}>
      <div className={styles.eyebrow}>{eyebrow}</div>
      <h1>{title}</h1>
      <p className={styles.updated}>עודכן לאחרונה: {updated}</p>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
