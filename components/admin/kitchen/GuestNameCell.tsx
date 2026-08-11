"use client";

import { useState } from "react";
import { Modal } from "@/components/admin/Modal";
import styles from "@/app/admin/admin.module.css";

export interface GuestHistoryEvent {
  id: string;
  name: string;
  date: string | null;
  eventType: "onsite" | "offsite";
  menu: { recipeName: string; servings: number; baseUnit: string }[];
}

export function GuestNameCell({ name, history }: { name: string; history: GuestHistoryEvent[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={styles.linkButton} onClick={() => setOpen(true)}>
        {name}
      </button>
      {open && (
        <Modal title={`ההיסטוריה של ${name}`} onClose={() => setOpen(false)}>
          {history.length === 0 ? (
            <p className={styles.muted}>עדיין לא השתתפ/ה באף אירוע.</p>
          ) : (
            history.map((ev) => (
              <div key={ev.id} style={{ marginBottom: 18 }}>
                <div style={{ fontWeight: 600 }}>
                  {ev.name}
                  {ev.date ? ` — ${ev.date}` : ""}{" "}
                  <span className={styles.muted} style={{ fontWeight: 400 }}>
                    ({ev.eventType === "offsite" ? "אירוע חוץ" : "אצלנו"})
                  </span>
                </div>
                {ev.menu.length > 0 ? (
                  <ul style={{ marginTop: 6, paddingInlineStart: 20 }}>
                    {ev.menu.map((m, i) => (
                      <li key={i} style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>
                        {m.recipeName}
                        {m.servings ? ` (${m.servings} ${m.baseUnit})` : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.muted} style={{ marginTop: 4 }}>
                    אין תפריט מוגדר.
                  </p>
                )}
              </div>
            ))
          )}
        </Modal>
      )}
    </>
  );
}
