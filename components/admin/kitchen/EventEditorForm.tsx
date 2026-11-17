"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import type { KLEvent, KLEventType, KLGuest } from "@/lib/kitchen/types";
import {
  CATEGORIES,
  KITCHEN_FACILITIES,
  RESTRICTION_TAGS,
  SERVICE_STYLES,
  STAFF_ROLES,
  dossierTotal,
  emptyDossier,
  staffGaps,
  type KLEventDossier,
} from "@/lib/kitchen/eventDossier";
import styles from "@/app/admin/admin.module.css";
import d from "./eventDossier.module.css";

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

/** Values a new file can start with (e.g. from a website inquiry, or a day picked on the calendar). */
export interface EventPrefill {
  name?: string;
  date?: string;
  eventType?: KLEventType;
  location?: string;
  guestCount?: number;
  notes?: string;
  dossier?: Partial<KLEventDossier>;
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

const SECTIONS = [
  ["details", "פרטי האירוע"],
  ["venue", "מקום ומטבח"],
  ["diet", "סועדים והגבלות"],
  ["menu", "תפריט"],
  ["price", "מחיר ותשלום"],
  ["staff", "צוות"],
  ["drinks", "שתייה"],
  ["equipment", "ציוד"],
  ["tasks", "משימות"],
] as const;

const fmtMoney = (n: number) => `₪${n.toLocaleString("he-IL", { maximumFractionDigits: 2 })}`;

/** A labelled checkbox that looks like a big tappable chip. */
function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className={`${d.check} ${checked ? d.checkOn : ""}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function EventEditorForm({
  eventId,
  initial,
  prefill,
  dishRecipes,
  guests,
  staffNames,
}: {
  eventId?: string;
  initial?: KLEvent;
  prefill?: EventPrefill;
  dishRecipes: RecipeOption[];
  guests: KLGuest[];
  staffNames: string[];
}) {
  const router = useRouter();
  const staffListId = useId();
  const [name, setName] = useState(initial?.name ?? prefill?.name ?? "");
  const [eventType, setEventType] = useState<KLEventType>(initial?.eventType ?? prefill?.eventType ?? "onsite");
  const [date, setDate] = useState(initial?.date ?? prefill?.date ?? "");
  const [location, setLocation] = useState(initial?.location ?? prefill?.location ?? "");
  const [guestCount, setGuestCount] = useState(String(initial?.guestCount ?? prefill?.guestCount ?? 0));
  const [notes, setNotes] = useState(initial?.notes ?? prefill?.notes ?? "");
  const [dos, setDos] = useState<KLEventDossier>(() => ({ ...emptyDossier(), ...(prefill?.dossier ?? {}), ...(initial?.dossier ?? {}) }));
  const [menu, setMenu] = useState<MenuRow[]>(
    (initial?.menu ?? []).map((m) => ({ recipeId: m.recipeId, servings: String(m.servings) }))
  );
  const [seats, setSeats] = useState<SeatRow[]>(emptySeats(initial?.guestCount ?? 0, initial?.seats ?? []));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const set = <K extends keyof KLEventDossier>(key: K, value: KLEventDossier[K]) => {
    setDos((prev) => ({ ...prev, [key]: value }));
    setSavedAt(null);
  };

  const guests_ = Math.max(0, parseInt(guestCount, 10) || 0);
  const totals = dossierTotal(dos, guests_);
  const gaps = staffGaps(dos);
  const hasPrice = dos.pricePerDiner !== null || dos.priceExtras.length > 0;

  function applyGuestCount(value: string) {
    setGuestCount(value);
    setSavedAt(null);
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
      guestCount: guests_,
      notes: notes.trim(),
      dossier: dos,
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
    if (!eventId && data.id) {
      router.replace(`/admin/kitchen/events/${data.id}`);
      return;
    }
    setSavedAt(Date.now());
    router.refresh();
  }

  async function handleDelete() {
    if (!eventId) return;
    if (!window.confirm("למחוק את תיק האירוע לצמיתות?")) return;
    setSaving(true);
    await fetch(`/api/admin/kitchen/events/${eventId}`, { method: "DELETE" });
    router.push("/admin/kitchen/events");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <nav className={d.jumpNav} aria-label="קפיצה לחלק בתיק">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
      </nav>

      {/* ---------- details ---------- */}
      <div className={`${styles.card} ${d.section}`} id="details">
        <h2>פרטי האירוע</h2>

        <div className={d.statusSwitch} style={{ marginBottom: 20 }}>
          <button
            type="button"
            className={`${d.statusBtn} ${dos.dealStatus === "open" ? d.statusOpenOn : ""}`}
            onClick={() => set("dealStatus", "open")}
            aria-pressed={dos.dealStatus === "open"}
          >
            עדיין לא סגור
            <small>בשיחות, מנסים לסגור תאריך ופרטים</small>
          </button>
          <button
            type="button"
            className={`${d.statusBtn} ${dos.dealStatus === "closed" ? d.statusClosedOn : ""}`}
            onClick={() => set("dealStatus", "closed")}
            aria-pressed={dos.dealStatus === "closed"}
          >
            סגור
            <small>האירוע סגור ומאושר</small>
          </button>
        </div>

        <div className={d.grid}>
          <div className={`${styles.field} ${d.full}`}>
            <label>שם האירוע</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="למשל: ערב חברה — אקמה" />
          </div>
          <div className={styles.field}>
            <label>תאריך</label>
            <input type="date" value={date ?? ""} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label>שעת התכנסות</label>
            <input type="time" value={dos.gatherTime} onChange={(e) => set("gatherTime", e.target.value)} />
          </div>
          <div className={styles.field}>
            <label>שעת התחלה</label>
            <input type="time" value={dos.startTime} onChange={(e) => set("startTime", e.target.value)} />
          </div>
          <div className={styles.field}>
            <label>שעת סיום</label>
            <input type="time" value={dos.endTime} onChange={(e) => set("endTime", e.target.value)} />
          </div>
          <div className={styles.field}>
            <label>מספר סועדים</label>
            <input type="number" min="0" inputMode="numeric" value={guestCount} onChange={(e) => applyGuestCount(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label>מתוכם ילדים (מנות ילדים)</label>
            <input type="number" min="0" inputMode="numeric" value={dos.kidsCount} onChange={(e) => set("kidsCount", Number(e.target.value) || 0)} />
          </div>
          <div className={styles.field}>
            <label>כמות מנות שונות באירוע</label>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={dos.portionsCount ?? ""}
              onChange={(e) => set("portionsCount", e.target.value === "" ? null : Number(e.target.value))}
            />
            <small className={styles.muted}>
              {menu.filter((m) => m.recipeId).length > 0 ? `בתפריט מהמתכונים: ${menu.filter((m) => m.recipeId).length} מנות` : "כמה מנות שונות מוגשות (לסועד / למרכז השולחן / בעמדות)"}
            </small>
          </div>
          <div className={styles.field}>
            <label>סוג האירוע</label>
            <select value={dos.category} onChange={(e) => set("category", e.target.value)}>
              <option value="">— בחירה —</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          {dos.category === "other" && (
            <div className={styles.field}>
              <label>איזה סוג?</label>
              <input value={dos.categoryOther} onChange={(e) => set("categoryOther", e.target.value)} placeholder="משהו מיוחד..." />
            </div>
          )}
          <div className={`${styles.field} ${d.full}`}>
            <label>סגנון הגשה</label>
            <select value={dos.serviceStyle} onChange={(e) => set("serviceStyle", e.target.value)}>
              <option value="">— בחירה —</option>
              {SERVICE_STYLES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className={d.sub}>איש קשר (הלקוח)</p>
        <div className={d.grid}>
          <div className={styles.field}>
            <label>שם</label>
            <input value={dos.clientName} onChange={(e) => set("clientName", e.target.value)} />
          </div>
          <div className={styles.field}>
            <label>טלפון</label>
            <input type="tel" dir="ltr" style={{ textAlign: "right" }} value={dos.clientPhone} onChange={(e) => set("clientPhone", e.target.value)} />
          </div>
          <div className={styles.field}>
            <label>אימייל</label>
            <input type="email" dir="ltr" style={{ textAlign: "right" }} value={dos.clientEmail} onChange={(e) => set("clientEmail", e.target.value)} />
          </div>
        </div>

        <div className={`${styles.field} ${d.full}`} style={{ marginTop: 16 }}>
          <label>דגשים מיוחדים והערות</label>
          <textarea rows={3} value={notes} onChange={(e) => { setNotes(e.target.value); setSavedAt(null); }} />
        </div>
      </div>

      {/* ---------- venue & kitchen ---------- */}
      <div className={`${styles.card} ${d.section}`} id="venue">
        <h2>מקום ומטבח</h2>
        <div className={d.grid}>
          <div className={styles.field}>
            <label>איפה האירוע?</label>
            <select value={eventType} onChange={(e) => setEventType(e.target.value as KLEventType)}>
              <option value="onsite">אצלנו</option>
              <option value="offsite">חוץ</option>
            </select>
          </div>
          {eventType === "offsite" && (
            <div className={styles.field}>
              <label>שם המקום</label>
              <input value={dos.venueName} onChange={(e) => set("venueName", e.target.value)} placeholder="אולם, וילה, משרד..." />
            </div>
          )}
          <div className={`${styles.field} ${d.full}`}>
            <label>{eventType === "offsite" ? "מיקום מדויק (כתובת)" : "הערת מיקום"}</label>
            <input value={location} onChange={(e) => { setLocation(e.target.value); setSavedAt(null); }} />
          </div>
          {eventType === "offsite" && (
            <>
              <div className={`${styles.field} ${d.full}`}>
                <label>הגעה וחניה (קומה, מעלית, מרחק מהחניה, שעות כניסה)</label>
                <textarea rows={2} value={dos.venueAccess} onChange={(e) => set("venueAccess", e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>איש קשר במקום</label>
                <input value={dos.siteContactName} onChange={(e) => set("siteContactName", e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>טלפון איש קשר במקום</label>
                <input type="tel" dir="ltr" style={{ textAlign: "right" }} value={dos.siteContactPhone} onChange={(e) => set("siteContactPhone", e.target.value)} />
              </div>
            </>
          )}
        </div>

        {eventType === "offsite" && (
          <>
            <p className={d.sub}>מה יש במטבח של המקום?</p>
            <div className={d.pills}>
              {KITCHEN_FACILITIES.map((f) => (
                <Check key={f.value} checked={dos.kitchenHas.includes(f.value)} onChange={() => set("kitchenHas", toggle(dos.kitchenHas, f.value))}>
                  {f.label}
                </Check>
              ))}
            </div>
            <div className={`${styles.field} ${d.full}`} style={{ marginTop: 14 }}>
              <label>פרטים על המטבח והציוד שיש שם</label>
              <textarea rows={2} value={dos.kitchenNotes} onChange={(e) => set("kitchenNotes", e.target.value)} placeholder="כמה להבות, גודל תנור, מקום במקרר..." />
            </div>
            <div className={`${styles.field} ${d.full}`} style={{ marginTop: 14 }}>
              <label>פרטים נוספים על המקום</label>
              <textarea rows={2} value={dos.venueNotes} onChange={(e) => set("venueNotes", e.target.value)} />
            </div>
          </>
        )}
      </div>

      {/* ---------- diners & dietary ---------- */}
      <div className={`${styles.card} ${d.section}`} id="diet">
        <h2>סועדים והגבלות תזונה</h2>
        <p className={d.sub} style={{ marginTop: 0 }}>הגבלות כלליות לאירוע</p>
        <div className={d.pills}>
          {RESTRICTION_TAGS.map((t) => (
            <Check
              key={t.value}
              checked={dos.generalRestrictionTags.includes(t.value)}
              onChange={() => set("generalRestrictionTags", toggle(dos.generalRestrictionTags, t.value))}
            >
              {t.label}
            </Check>
          ))}
        </div>
        <div className={`${styles.field} ${d.full}`} style={{ marginTop: 14 }}>
          <label>הערות להגבלות כלליות</label>
          <textarea rows={2} value={dos.generalRestrictions} onChange={(e) => set("generalRestrictions", e.target.value)} />
        </div>

        <p className={d.sub}>הגבלות לפי שם סועד</p>
        <div className={d.rows}>
          {dos.dinerRestrictions.map((r, i) => (
            <div key={i} className={d.row}>
              <input
                className={d.grow}
                placeholder="שם הסועד"
                value={r.name}
                onChange={(e) => set("dinerRestrictions", dos.dinerRestrictions.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
              />
              <input
                className={d.grow}
                placeholder="הגבלה (למשל: אלרגיה לאגוזים)"
                value={r.restriction}
                onChange={(e) => set("dinerRestrictions", dos.dinerRestrictions.map((x, j) => (j === i ? { ...x, restriction: e.target.value } : x)))}
              />
              <button type="button" className={styles.btnDanger} onClick={() => set("dinerRestrictions", dos.dinerRestrictions.filter((_, j) => j !== i))}>
                הסרה
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className={styles.btnSecondary}
          style={{ marginTop: 12 }}
          onClick={() => set("dinerRestrictions", [...dos.dinerRestrictions, { name: "", restriction: "" }])}
        >
          + סועד עם הגבלה
        </button>

        <details style={{ marginTop: 22 }}>
          <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 14 }}>שיבוץ סועדים מהמאגר (אופציונלי)</summary>
          <div style={{ marginTop: 12 }}>
            {seats.map((seat, i) => (
              <div key={i} className={styles.listRow}>
                <span className={styles.listIndex}>{i + 1}.</span>
                {seat.newGuestMode ? (
                  <>
                    <input placeholder="שם" value={seat.newName} onChange={(e) => updateSeat(i, { newName: e.target.value })} style={{ width: 130 }} />
                    <input placeholder="טלפון" value={seat.newPhone} onChange={(e) => updateSeat(i, { newPhone: e.target.value })} style={{ width: 110 }} />
                    <input placeholder="הגבלות" value={seat.newRestrictions} onChange={(e) => updateSeat(i, { newRestrictions: e.target.value })} style={{ flex: 1 }} />
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
        </details>
      </div>

      {/* ---------- menu ---------- */}
      <div className={`${styles.card} ${d.section}`} id="menu">
        <h2>תפריט</h2>
        <div className={d.menuSteps}>
          <Check checked={dos.menuBuilt} onChange={(v) => set("menuBuilt", v)}>
            נבנה תפריט
          </Check>
          <Check checked={dos.menuSent} onChange={(v) => set("menuSent", v)}>
            נשלח ללקוח
          </Check>
          <Check checked={dos.menuApproved} onChange={(v) => set("menuApproved", v)}>
            אושר על ידי הלקוח
          </Check>
        </div>
        <div className={styles.field} style={{ marginBottom: 20 }}>
          <label>הערות לתפריט</label>
          <textarea rows={2} value={dos.menuNotes} onChange={(e) => set("menuNotes", e.target.value)} />
        </div>

        <p className={d.sub} style={{ marginTop: 0 }}>מנות מהמתכונים (לחישוב עלות והכנות)</p>
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
            <input type="number" min="1" placeholder="מנות" value={row.servings} onChange={(e) => updateMenuRow(i, { servings: e.target.value })} style={{ width: 90 }} />
            <button type="button" className={styles.btnDanger} onClick={() => setMenu((m) => m.filter((_, idx) => idx !== i))}>
              הסרה
            </button>
          </div>
        ))}
        {menu.length === 0 && <p className={styles.muted}>עדיין אין מנות בתפריט.</p>}
        <button type="button" className={styles.btnSecondary} style={{ marginTop: 14 }} onClick={() => setMenu((m) => [...m, { recipeId: "", servings: guestCount || "1" }])}>
          + מנה
        </button>
      </div>

      {/* ---------- price & payment ---------- */}
      <div className={`${styles.card} ${d.section}`} id="price">
        <h2>מחיר ותשלום</h2>
        <div className={d.grid}>
          <div className={styles.field}>
            <label>מחיר לסועד (₪)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={dos.pricePerDiner ?? ""}
              onChange={(e) => set("pricePerDiner", e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
          <div className={styles.field}>
            <label>הנחה (₪)</label>
            <input type="number" min="0" step="0.01" inputMode="decimal" value={dos.discount || ""} onChange={(e) => set("discount", Number(e.target.value) || 0)} />
          </div>
          <div className={styles.field}>
            <label>סיבת ההנחה</label>
            <input value={dos.discountNote} onChange={(e) => set("discountNote", e.target.value)} />
          </div>
        </div>

        <p className={d.sub}>תוספות מחיר</p>
        <div className={d.rows}>
          {dos.priceExtras.map((x, i) => (
            <div key={i} className={d.row}>
              <input
                className={d.grow}
                placeholder="תיאור (למשל: מלצרים נוספים)"
                value={x.label}
                onChange={(e) => set("priceExtras", dos.priceExtras.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))}
              />
              <input
                className={d.narrow}
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder="₪"
                value={x.amount || ""}
                onChange={(e) => set("priceExtras", dos.priceExtras.map((y, j) => (j === i ? { ...y, amount: Number(e.target.value) || 0 } : y)))}
              />
              <button type="button" className={styles.btnDanger} onClick={() => set("priceExtras", dos.priceExtras.filter((_, j) => j !== i))}>
                הסרה
              </button>
            </div>
          ))}
        </div>
        <button type="button" className={styles.btnSecondary} style={{ marginTop: 12 }} onClick={() => set("priceExtras", [...dos.priceExtras, { label: "", amount: 0 }])}>
          + תוספת
        </button>

        {hasPrice && (
          <div className={d.totals}>
            <span>
              {guests_} סועדים × {fmtMoney(dos.pricePerDiner ?? 0)} = {fmtMoney(totals.base)}
            </span>
            {totals.extras !== 0 && <span>תוספות: {fmtMoney(totals.extras)}</span>}
            {totals.discount > 0 && <span>הנחה: −{fmtMoney(totals.discount)}</span>}
            <strong>סה״כ: {fmtMoney(totals.total)}</strong>
            <span className={styles.muted}>לפי המחירים שהוזנו, כפי שהם (לא מחושב מע״מ).</span>
          </div>
        )}

        <p className={d.sub}>מעקב עסקה</p>
        <div className={d.menuSteps}>
          <Check checked={dos.quoteSent} onChange={(v) => set("quoteSent", v)}>
            נשלחה הצעת מחיר
          </Check>
          <Check checked={dos.contractSigned} onChange={(v) => set("contractSigned", v)}>
            הלקוח אישר / חתם
          </Check>
          <Check checked={dos.depositPaid} onChange={(v) => set("depositPaid", v)}>
            שולמה מקדמה
          </Check>
          <Check checked={dos.fullyPaid} onChange={(v) => set("fullyPaid", v)}>
            שולם במלואו
          </Check>
        </div>
        <div className={d.grid} style={{ marginTop: 12 }}>
          <div className={styles.field}>
            <label>סכום מקדמה (₪)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={dos.depositAmount ?? ""}
              onChange={(e) => set("depositAmount", e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* ---------- staff ---------- */}
      <div className={`${styles.card} ${d.section}`} id="staff">
        <h2>צוות</h2>
        <p className={d.sectionHint}>כמה אנשי צוות צריך, ומי מהצוות שלנו יהיה באירוע.</p>
        <div className={d.grid}>
          <div className={styles.field}>
            <label>מנהלים</label>
            <input type="number" min="0" inputMode="numeric" value={dos.needManagers} onChange={(e) => set("needManagers", Number(e.target.value) || 0)} />
          </div>
          <div className={styles.field}>
            <label>טבחים</label>
            <input type="number" min="0" inputMode="numeric" value={dos.needCooks} onChange={(e) => set("needCooks", Number(e.target.value) || 0)} />
          </div>
          <div className={styles.field}>
            <label>מלצרים</label>
            <input type="number" min="0" inputMode="numeric" value={dos.needWaiters} onChange={(e) => set("needWaiters", Number(e.target.value) || 0)} />
          </div>
        </div>

        <p className={d.sub}>העובדים באירוע</p>
        <datalist id={staffListId}>
          {staffNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <div className={d.rows}>
          {dos.staff.map((m, i) => (
            <div key={i} className={d.row}>
              <input
                className={d.grow}
                list={staffListId}
                placeholder="שם העובד"
                value={m.name}
                onChange={(e) => set("staff", dos.staff.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
              />
              <select value={m.role} onChange={(e) => set("staff", dos.staff.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))}>
                {STAFF_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <button type="button" className={styles.btnDanger} onClick={() => set("staff", dos.staff.filter((_, j) => j !== i))}>
                הסרה
              </button>
            </div>
          ))}
        </div>
        <button type="button" className={styles.btnSecondary} style={{ marginTop: 12 }} onClick={() => set("staff", [...dos.staff, { name: "", role: "waiter" }])}>
          + עובד
        </button>
        {(gaps.managers > 0 || gaps.cooks > 0 || gaps.waiters > 0) && (
          <p className={d.warn} style={{ marginTop: 12 }}>
            עוד חסרים:{" "}
            {[gaps.managers && `${gaps.managers} מנהלים`, gaps.cooks && `${gaps.cooks} טבחים`, gaps.waiters && `${gaps.waiters} מלצרים`].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      {/* ---------- drinks ---------- */}
      <div className={`${styles.card} ${d.section}`} id="drinks">
        <h2>שתייה</h2>
        <div className={d.grid}>
          <div className={d.checkRow}>
            <Check checked={dos.drinksByUs} onChange={(v) => set("drinksByUs", v)}>
              אנחנו דואגים לשתייה
            </Check>
            {dos.drinksByUs && <input className={d.noteInput} placeholder="מה, כמה, מי מביא" value={dos.drinksNotes} onChange={(e) => set("drinksNotes", e.target.value)} />}
          </div>
          <div className={d.checkRow}>
            <Check checked={dos.alcohol} onChange={(v) => set("alcohol", v)}>
              יש אלכוהול
            </Check>
            {dos.alcohol && <input className={d.noteInput} placeholder="איזה, מי מספק, ברמן?" value={dos.alcoholNotes} onChange={(e) => set("alcoholNotes", e.target.value)} />}
          </div>
          <div className={d.checkRow}>
            <Check checked={dos.ice} onChange={(v) => set("ice", v)}>
              צריך קרח
            </Check>
            {dos.ice && <input className={d.noteInput} placeholder="כמות, מי מביא" value={dos.iceNotes} onChange={(e) => set("iceNotes", e.target.value)} />}
          </div>
        </div>
      </div>

      {/* ---------- equipment ---------- */}
      <div className={`${styles.card} ${d.section}`} id="equipment">
        <h2>ציוד</h2>
        <div className={`${styles.field} ${d.full}`}>
          <label>ציוד מיוחד שצריך</label>
          <textarea rows={2} value={dos.specialEquipment} onChange={(e) => set("specialEquipment", e.target.value)} />
        </div>
        <div className={d.grid} style={{ marginTop: 16 }}>
          <div className={d.checkRow}>
            <Check checked={dos.bringServingWare} onChange={(v) => set("bringServingWare", v)}>
              אנחנו מביאים כלי הגשה
            </Check>
            {dos.bringServingWare && <input className={d.noteInput} placeholder="אילו כלים?" value={dos.servingWareNotes} onChange={(e) => set("servingWareNotes", e.target.value)} />}
          </div>
          <div className={d.checkRow}>
            <Check checked={dos.rentalNeeded} onChange={(v) => set("rentalNeeded", v)}>
              נדרשת השכרת ציוד
            </Check>
            {dos.rentalNeeded && <input className={d.noteInput} placeholder="מה להשכיר, ממי" value={dos.rentalNotes} onChange={(e) => set("rentalNotes", e.target.value)} />}
          </div>
        </div>
      </div>

      {/* ---------- tasks ---------- */}
      <div className={`${styles.card} ${d.section}`} id="tasks">
        <h2>משימות לאירוע</h2>
        <div className={d.rows}>
          {dos.tasks.map((t, i) => (
            <div key={i} className={d.row}>
              <input
                type="checkbox"
                aria-label="בוצע"
                style={{ width: 20, height: 20, accentColor: "var(--olive-deep)" }}
                checked={t.done}
                onChange={(e) => set("tasks", dos.tasks.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x)))}
              />
              <input
                className={`${d.grow} ${t.done ? d.taskDone : ""}`}
                placeholder="משימה"
                value={t.text}
                onChange={(e) => set("tasks", dos.tasks.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
              />
              <button type="button" className={styles.btnDanger} onClick={() => set("tasks", dos.tasks.filter((_, j) => j !== i))}>
                הסרה
              </button>
            </div>
          ))}
        </div>
        <button type="button" className={styles.btnSecondary} style={{ marginTop: 12 }} onClick={() => set("tasks", [...dos.tasks, { text: "", done: false }])}>
          + משימה
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={d.saveBar}>
        <button type="submit" className={styles.btn} disabled={saving}>
          {saving ? "שומר..." : eventId ? "שמירת התיק" : "יצירת תיק אירוע"}
        </button>
        {savedAt && <span className={d.saved}>✓ נשמר</span>}
        <span className={d.spacer} />
        {eventId && (
          <>
            <Link href={`/admin/kitchen/events/${eventId}/summary`} className={styles.btnSecondary}>
              פתק הכנה וקניות
            </Link>
            <button type="button" className={styles.btnDanger} onClick={handleDelete} disabled={saving}>
              מחיקה
            </button>
          </>
        )}
      </div>
    </form>
  );
}
