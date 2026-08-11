"use client";

import { useActionState } from "react";
import { createTeamMember } from "@/lib/actions/admin/team";
import styles from "@/app/admin/admin.module.css";

const initialState = { error: null as string | null };

export function CreateTeamMemberForm() {
  const [state, action, pending] = useActionState(createTeamMember, initialState);

  return (
    <form action={action} className={styles.form}>
      <div className={styles.field}>
        <label>אימייל</label>
        <input name="email" type="email" required />
      </div>
      <div className={styles.field}>
        <label>סיסמה זמנית</label>
        <input name="password" type="text" minLength={8} required />
      </div>
      <div className={styles.field}>
        <label>תפקיד</label>
        <select name="role" defaultValue="kitchen">
          <option value="kitchen">מטבח</option>
          <option value="sales">מכירות</option>
          <option value="owner">בעלים</option>
        </select>
      </div>
      {state.error && <p className={styles.error}>{state.error}</p>}
      <button type="submit" className={styles.btn} disabled={pending}>
        {pending ? "יוצר..." : "הוספת איש/אשת צוות"}
      </button>
    </form>
  );
}
