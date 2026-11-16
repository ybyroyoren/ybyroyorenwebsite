import { requireAdminSection } from "@/lib/admin-auth";
import { getAllTeam } from "@/lib/team";
import {
  addTeamMember,
  attachTeamImage,
  deleteTeamMember,
  getTeamImageTicket,
  moveTeamMember,
  removeTeamImage,
  updateTeamMember,
} from "@/lib/actions/admin/about-team";
import { ImageUploadButton } from "@/components/admin/ImageUploadButton";
import { OrderButtons } from "@/components/admin/OrderButtons";
import styles from "../../admin.module.css";

export default async function AdminAboutTeamPage() {
  await requireAdminSection("about_team");
  const members = await getAllTeam();
  const order = members.map((m) => m.id).join(",");

  return (
    <>
      <h1>צוות באודות</h1>
      <div className={styles.explainBox}>
        האנשים שמוצגים בעמוד האודות, מתחת להיכרות איתך: תמונה, שם, תפקיד ופסקה קצרה. הסדר כאן הוא הסדר באתר. עד שיש לפחות אדם אחד מוצג,
        החלק הזה לא מופיע בעמוד. השדות באנגלית לא חובה, ובלעדיהם יוצג הטקסט העברי גם באתר באנגלית.
      </div>

      <div className={styles.card}>
        <h2>הוספת אדם</h2>
        <form action={addTeamMember} className={styles.form}>
          <div className={styles.field}>
            <label>שם</label>
            <input name="name" required maxLength={80} />
          </div>
          <div className={styles.field}>
            <label>תפקיד</label>
            <input name="role" maxLength={80} placeholder="למשל: סו-שף" />
          </div>
          <div className={styles.field} style={{ width: "100%" }}>
            <label>פסקה קצרה</label>
            <textarea name="bio" rows={3} maxLength={1200} style={{ width: "100%" }} />
          </div>
          <details style={{ width: "100%" }}>
            <summary style={{ cursor: "pointer" }}>באנגלית (לא חובה)</summary>
            <div className={styles.form} style={{ marginTop: 10 }}>
              <div className={styles.field}>
                <label>Name</label>
                <input name="nameEn" dir="ltr" maxLength={80} />
              </div>
              <div className={styles.field}>
                <label>Role</label>
                <input name="roleEn" dir="ltr" maxLength={80} />
              </div>
              <div className={styles.field} style={{ width: "100%" }}>
                <label>Short paragraph</label>
                <textarea name="bioEn" dir="ltr" rows={3} maxLength={1200} style={{ width: "100%" }} />
              </div>
            </div>
          </details>
          <p className={styles.muted} style={{ width: "100%", margin: 0 }}>התמונה מעלים אחרי ההוספה, בכרטיס של האדם.</p>
          <button type="submit" className={styles.btn}>
            הוספה
          </button>
        </form>
      </div>

      {members.map((member, index) => (
        <div key={member.id} className={styles.card}>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ width: 150 }}>
              {member.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.imageUrl} alt="" style={{ width: 150, height: 188, objectFit: "cover", borderRadius: 6 }} />
              ) : (
                <div
                  style={{
                    width: 150,
                    height: 188,
                    borderRadius: 6,
                    background: "var(--olive-mist)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--olive-deep)",
                    fontSize: 13,
                  }}
                >
                  אין תמונה
                </div>
              )}
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                <ImageUploadButton
                  label={member.imageUrl ? "החלפת תמונה" : "העלאת תמונה"}
                  getTicket={getTeamImageTicket.bind(null, member.id)}
                  onUploaded={attachTeamImage.bind(null, member.id)}
                />
                {member.imageUrl && (
                  <form action={removeTeamImage}>
                    <input type="hidden" name="id" value={member.id} />
                    <button type="submit" className={styles.btnSecondary} style={{ width: "100%" }}>
                      הסרת תמונה
                    </button>
                  </form>
                )}
              </div>
            </div>

            <form action={updateTeamMember} className={styles.form} style={{ flex: 1, minWidth: 280 }}>
              <input type="hidden" name="id" value={member.id} />
              <div className={styles.field}>
                <label>שם</label>
                <input name="name" required maxLength={80} defaultValue={member.name} />
              </div>
              <div className={styles.field}>
                <label>תפקיד</label>
                <input name="role" maxLength={80} defaultValue={member.role} />
              </div>
              <div className={styles.field} style={{ width: "100%" }}>
                <label>פסקה קצרה</label>
                <textarea name="bio" rows={4} maxLength={1200} defaultValue={member.bio} style={{ width: "100%" }} />
              </div>
              <details style={{ width: "100%" }}>
                <summary style={{ cursor: "pointer" }}>באנגלית</summary>
                <div className={styles.form} style={{ marginTop: 10 }}>
                  <div className={styles.field}>
                    <label>Name</label>
                    <input name="nameEn" dir="ltr" maxLength={80} defaultValue={member.nameEn} />
                  </div>
                  <div className={styles.field}>
                    <label>Role</label>
                    <input name="roleEn" dir="ltr" maxLength={80} defaultValue={member.roleEn} />
                  </div>
                  <div className={styles.field} style={{ width: "100%" }}>
                    <label>Short paragraph</label>
                    <textarea name="bioEn" dir="ltr" rows={3} maxLength={1200} defaultValue={member.bioEn} style={{ width: "100%" }} />
                  </div>
                </div>
              </details>
              <label style={{ display: "inline-flex", gap: 8, alignItems: "center", fontWeight: 400 }}>
                <input type="checkbox" name="active" defaultChecked={member.active} /> מוצג באתר
              </label>
              <button type="submit" className={styles.btn}>
                שמירה
              </button>
            </form>
          </div>

          <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
            {members.length > 1 && (
              <OrderButtons
                action={moveTeamMember}
                id={member.id}
                order={order}
                isFirst={index === 0}
                isLast={index === members.length - 1}
                label={member.name}
                layout="row"
              />
            )}
            <form action={deleteTeamMember}>
              <input type="hidden" name="id" value={member.id} />
              <button type="submit" className={styles.btnDanger}>
                מחיקת האדם
              </button>
            </form>
          </div>
        </div>
      ))}
      {members.length === 0 && <p className={styles.muted}>עוד לא נוספו אנשים.</p>}
    </>
  );
}
