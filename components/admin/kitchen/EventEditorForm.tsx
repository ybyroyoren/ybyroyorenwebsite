"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { KLEvent, KLEventType, KLGuest } from "@/lib/kitchen/types";
import styles from "@/app/admin/admin.module.css";

interface RecipeOption {
  id: string;
  name: string;
  baseUnit: string;
}

interface MenuRow {
  recipeId: string;
  servings: string;
}

interface SeatRow {
  guestId: string;
  newGuestMode: boolean;
  newName: string;
  newPhone: string;
  newRestrictions: string;
}

function emptySeats(count: number, existing: KLEvent["seats"]): SeatRow[] {
  return Array.from({ length: count }, (_, i) => {
    const existingSeat = existing.find((s) => s.seatIndex === i);
    return {
      guestId: existingSeat?.guestId ?? "",
      newGuestMode: false,
      newName: "",
      newPhone: "",
      newRestrictions: "",
    };
  });
}

export function EventEditorForm({
  eventId,
  initial,
  dishRecipes,
  guests,
}: {
  eventId?: string;
  initial?: KLEvent;
  dishRecipes: RecipeOption[];
  guests: KLGuest[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [eventType, setEventType] = useState<KLEventType>(initial?.eventType ?? "onsite");
  const [date, setDate] = useState(initial?.date ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [guestCount, setGuestCount] = useState(String(initial?.guestCount ?? 0));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [menu, setMenu] = useState<MenuRow[]>(
    (initial?.menu ?? []).map((m) => ({ recipeId: m.recipeId, servings: String(m.servings) }))
  );
  const [seats, setSeats] = useState<SeatRow[]>(emptySeats(initial?.guestCount ?? 0, initial?.seats ?? []));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyGuestCount(value: string) {
    setGuestCount(value);
    const n = Math.max(0, parseInt(value, 10) || 0);
    setSeats((prev) => {
      const next = [...prev];
      while (next.length < n) next.push({ guestId: "", newGuestMode: false, newName: "", newPhone: "", newRestrictions: "" });
      next.length = n;
      return next;
    });
  }

  function updateSeat(index: number, patch: Partial<SeatRow>) {
    setSeats((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function updateMenuRow(index: number, patch: Partial<MenuRow>) {
    setMenu((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("נא להזין שם אירוע");

    const payload = {
      name: name.trim(),
      date: date || null,
      eventType,
      location: location.trim(),
      guestCount: Math.max(0, parseInt(guestCount, 10) || 0),
      notes: notes.trim(),
      menu: menu.filter((m) => m.recipeId).map((m) => ({ recipeId: m.recipeId, servings: Number(m.servings) || 1 })),
      seats: seats.map((s, i) => ({
        seatIndex: i,
        guestId: s.newGuestMode ? null : s.guestId || null,
        newGuest: s.newGuestMode && s.newName.trim() ? { name: s.newName, phone: s.newPhone, restrictions: s.newRestrictions } : undefined,
      })),
    };

    setSaving(true);
    const url = eventId ? `/api/admin/kitchen/events/${eventId}` : "/api/admin/kitchen/events";
    const res = await fetch(url, {
      method: eventId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "שמירה נכשלה");
      return;
    }
    router.push("/admin/kitchen/events");
    router.refresh();
  }

  async function handleDelete() {
    if (!eventId) return;
    setSaving(true);
    await fetch(`/api/admin/kitchen/events/${eventId}`, { method: "DELETE" });
    router.push("/admin/kitchen/events");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={styles.card}>
        <h2>פרטי אירוע</h2>
        <div className={styles.form}>
          <div className={styles.field} style={{ width: "100%" }}>
            <label>שם האירוע</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className={styles.field}>
            <label>סוג</label>
            <select value={eventType} onChange={(e) => setEventType(e.target.value as KLEventType)}>
              <option value="onsite">אצלנו</option>
              <option value="offsite">אירוע חוץ</option>
            </select>
          </div>
          <div className={styles.field}>
            <label>תאריך</label>
            <input type="date" value={date ?? ""} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label>מספר סועדים</label>
            <input type="number" min="0" value={guestCount} onChange={(e) => applyGuestCount(e.target.value)} style={{ width: 90 }} />
          </div>
          <div className={styles.field} style={{ width: "100%" }}>
            <label>{eventType === "offsite" ? "כתובת" : "הערת מיקום"}</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} style={{ width: "100%" }} />
          </div>
          <div className={styles.field} style={{ width: "100%" }}>
            <label>הערות</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: "100%" }} rows={3} />
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h2>תפריט</h2>
        {menu.map((row, i) => (
          <div key={i} className={styles.listRow}>
            <span className={styles.listIndex}>{i + 1}.</span>
            <select value={row.recipeId} onChange={(e) => updateMenuRow(i, { recipeId: e.target.value })} style={{ flex: 1 }}>
              <option value="">בחר/י מנה</option>
              {dishRecipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              placeholder="מנות"
              value={row.servings}
              onChange={(e) => updateMenuRow(i, { servings: e.target.value })}
              style={{ width: 90 }}
            />
            <button type="button" className={styles.btnDanger} onClick={() => setMenu((m) => m.filter((_, idx) => idx !== i))}>
              הסרה
            </button>
          </div>
        ))}
        {menu.length === 0 && <p className={styles.muted}>עדיין אין פריטים בתפריט.</p>}
        <button
          type="button"
          className={styles.btnSecondary}
          style={{ marginTop: 14 }}
          onClick={() => setMenu((m) => [...m, { recipeId: "", servings: guestCount || "1" }])}
        >
          + מנה
        </button>
      </div>

      <div className={styles.card}>
        <h2>שיבוץ סועדים</h2>
        <p className={styles.muted} style={{ marginTop: -12, marginBottom: 16 }}>אופציונלי</p>
        {seats.map((seat, i) => (
          <div key={i} className={styles.listRow}>
            <span className={styles.listIndex}>{i + 1}.</span>
            {seat.newGuestMode ? (
              <>
                <input
                  placeholder="שם"
                  value={seat.newName}
                  onChange={(e) => updateSeat(i, { newName: e.target.value })}
                  style={{ width: 130 }}
                />
                <input
                  placeholder="טלפון"
                  value={seat.newPhone}
                  onChange={(e) => updateSeat(i, { newPhone: e.target.value })}
                  style={{ width: 110 }}
                />
                <input
                  placeholder="הגבלות"
                  value={seat.newRestrictions}
                  onChange={(e) => updateSeat(i, { newRestrictions: e.target.value })}
                  style={{ flex: 1 }}
                />
                <button type="button" className={styles.btnSecondary} onClick={() => updateSeat(i, { newGuestMode: false })}>
                  ביטול
                </button>
              </>
            ) : (
              <>
                <select value={seat.guestId} onChange={(e) => updateSeat(i, { guestId: e.target.value })} style={{ flex: 1 }}>
                  <option value="">— לא משובץ —</option>
                  {guests.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                      {g.restrictions ? ` (${g.restrictions})` : ""}
                    </option>
                  ))}
                </select>
                <button type="button" className={styles.btnSecondary} onClick={() => updateSeat(i, { newGuestMode: true })}>
                  + סועד חדש
                </button>
              </>
            )}
          </div>
        ))}
        {seats.length === 0 && <p className={styles.muted}>קבעו מספר סועדים כדי לשבץ מקומות.</p>}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" className={styles.btn} disabled={saving}>
          {saving ? "שומר..." : "שמירה"}
        </button>
        {eventId && (
          <button type="button" className={styles.btnDanger} onClick={handleDelete} disabled={saving}>
            מחיקת אירוע
          </button>
        )}
      </div>
    </form>
  );
}
