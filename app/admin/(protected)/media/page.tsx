import { requireAdminSection } from "@/lib/admin-auth";
import { getMediaByLocation, type MediaLocation } from "@/lib/media";
import { deleteMedia, uploadMedia } from "@/lib/actions/admin/media";
import styles from "../../admin.module.css";

const SECTIONS: { location: MediaLocation; title: string; note: string }[] = [
  {
    location: "home_carousel",
    title: "קרוסלת תמונות — עמוד הבית",
    note: "מוצגות לצד הכותרת הראשית בעמוד הבית.",
  },
  {
    location: "meals_carousel",
    title: "קרוסלת תמונות — ארוחות פתוחות",
    note: "מוצגות בראש עמוד הארוחות הפתוחות.",
  },
  {
    location: "events_carousel",
    title: "קרוסלת תמונות — אירועים פרטיים",
    note: "מוצגות בעמוד האירועים הפרטיים.",
  },
  {
    location: "about_hero",
    title: "תמונת אודות",
    note: "תמונה אחת בלבד — העלאת תמונה חדשה מחליפה את הקיימת.",
  },
];

export default async function AdminMediaPage() {
  await requireAdminSection("media");
  return (
    <>
      <h1>תמונות אתר</h1>

      {await Promise.all(
        SECTIONS.map(async (section) => {
          const items = await getMediaByLocation(section.location);
          return (
            <div key={section.location} className={styles.card}>
              <h2>{section.title}</h2>
              <p className={styles.muted}>{section.note}</p>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "16px 0" }}>
                {items.map((item) => (
                  <div key={item.id} style={{ position: "relative" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.url}
                      alt=""
                      style={{ width: 110, height: 110, objectFit: "cover", borderRadius: 6 }}
                    />
                    <form action={deleteMedia} style={{ marginTop: 4 }}>
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="url" value={item.url} />
                      <button type="submit" className={styles.btnDanger} style={{ width: "100%" }}>
                        מחיקה
                      </button>
                    </form>
                  </div>
                ))}
                {items.length === 0 && <p className={styles.muted}>אין תמונות עדיין.</p>}
              </div>

              <form action={uploadMedia}>
                <input type="hidden" name="location" value={section.location} />
                <input type="file" name="image" accept="image/*" required />
                <button type="submit" className={styles.btnSecondary} style={{ marginRight: 8 }}>
                  העלאת תמונה
                </button>
              </form>
            </div>
          );
        })
      )}
    </>
  );
}
