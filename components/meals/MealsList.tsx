"use client";

import { useState } from "react";
import type { MealView, DinerInput } from "@/lib/meals";
import { seatsLabel, seatsDisplayPct, isLowSeats } from "@/lib/seats";
import { formatCurrency } from "@/lib/pricing";
import { formatMealDateParts, formatMealDateFull } from "@/lib/date";
import styles from "./MealsList.module.css";

const RESTRICTION_OPTIONS = [
  "צמחוני",
  "טבעוני",
  "ללא גלוטן",
  "ללא לקטוז",
  "אלרגיה לאגוזים",
  "אלרגיה לדגים/פירות ים",
  "אחר — פירוט בהערות",
];

const DEPOSIT_PER_SEAT = 100;

function emptyDiner(): DinerInput {
  return { fullName: "", dietaryRestrictions: [], notes: "" };
}

export function MealsList({ meals }: { meals: MealView[] }) {
  const [selectedMeal, setSelectedMeal] = useState<MealView | null>(null);
  const [seatsCount, setSeatsCount] = useState(1);
  const [diners, setDiners] = useState<DinerInput[]>([emptyDiner()]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function openMeal(meal: MealView) {
    setSelectedMeal(meal);
    setSeatsCount(1);
    setDiners([emptyDiner()]);
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setError(null);
  }

  function closeDrawer() {
    setSelectedMeal(null);
  }

  function changeSeats(delta: number) {
    if (!selectedMeal) return;
    const next = Math.min(Math.max(1, seatsCount + delta), selectedMeal.remainingSeats);
    setSeatsCount(next);
    setDiners((prev) => {
      const copy = [...prev];
      while (copy.length < next) copy.push(emptyDiner());
      copy.length = next;
      return copy;
    });
  }

  function updateDiner(index: number, patch: Partial<DinerInput>) {
    setDiners((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  function toggleRestriction(index: number, restriction: string) {
    setDiners((prev) =>
      prev.map((d, i) => {
        if (i !== index) return d;
        const has = d.dietaryRestrictions.includes(restriction);
        return {
          ...d,
          dietaryRestrictions: has
            ? d.dietaryRestrictions.filter((r) => r !== restriction)
            : [...d.dietaryRestrictions, restriction],
        };
      })
    );
  }

  async function submit() {
    if (!selectedMeal) return;
    if (!customerName.trim() || !customerEmail.trim() || !customerPhone.trim()) {
      setError("נא למלא שם, אימייל וטלפון");
      return;
    }
    if (diners.some((d) => !d.fullName.trim())) {
      setError("שם מלא נדרש לכל סועד");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/meals/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealId: selectedMeal.id,
          customerName,
          customerEmail,
          customerPhone,
          diners,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "משהו השתבש, נסו שוב");
        return;
      }
      window.location.href = data.paymentUrl;
    } catch {
      setError("משהו השתבש, נסו שוב");
    } finally {
      setSubmitting(false);
    }
  }

  const mealTotal = selectedMeal ? selectedMeal.pricePerSeat * seatsCount : 0;
  const depositTotal = DEPOSIT_PER_SEAT * seatsCount;
  const balance = mealTotal - depositTotal;

  return (
    <>
      {meals.map((meal) => {
        const isFull = meal.remainingSeats <= 0;
        const pct = seatsDisplayPct(meal.remainingSeats, meal.totalSeats, meal.takenSeats);
        const { day, num, month } = formatMealDateParts(meal.date);
        return (
          <div
            key={meal.id}
            className={`${styles.card} ${isFull ? styles.full : ""}`}
            onClick={() => !isFull && openMeal(meal)}
          >
            <div className={styles.dateBlock}>
              <div className={styles.day}>{day}</div>
              <div className={styles.dayNum}>{num}</div>
              <div className={styles.month}>{month}</div>
            </div>
            <div className={styles.info}>
              <h3>{meal.title}</h3>
              <div className={styles.desc}>{meal.description}</div>
            </div>
            <div className={styles.seatsBlock}>
              <div className={styles.seatsBar}>
                <div className={styles.seatsBarFill} style={{ width: `${pct}%` }} />
              </div>
              <div className={`${styles.seatsText} ${isLowSeats(meal.remainingSeats) ? styles.low : ""}`}>
                {seatsLabel(meal.remainingSeats)}
              </div>
            </div>
            <div className={styles.ctaCol}>
              <div className={styles.price}>
                מחיר לסועד
                <br />
                <b>{formatCurrency(meal.pricePerSeat)}</b>
              </div>
              {isFull ? (
                <span className={styles.fullBadge}>אין מקומות פנויים</span>
              ) : (
                <span className={styles.btn}>פרטים והרשמה</span>
              )}
            </div>
          </div>
        );
      })}

      <div className={`${styles.overlay} ${selectedMeal ? styles.open : ""}`} onClick={closeDrawer} />
      <div className={`${styles.drawer} ${selectedMeal ? styles.open : ""}`}>
        {selectedMeal && (
          <>
            <div className={styles.drawerHead}>
              <div>
                <div className={styles.dayTag}>{formatMealDateFull(selectedMeal.date)}</div>
                <h3>{selectedMeal.title}</h3>
              </div>
              <button type="button" className={styles.close} onClick={closeDrawer}>
                ✕
              </button>
            </div>
            <div className={styles.drawerBody}>
              <p className={styles.summary}>
                ארוחה בת 10 מנות, מוגשות אישית. כל הגבלה או העדפת תזונה מקבלת מענה אישי לכל סועד —
                פשוט ציינו אותה למטה.
              </p>

              <div className={styles.seatsPicker}>
                <div className={styles.seatsPickerLabel}>
                  מספר סועדים
                  <small>{seatsLabel(selectedMeal.remainingSeats)}</small>
                </div>
                <div className={styles.qtyControl}>
                  <button type="button" onClick={() => changeSeats(-1)}>
                    −
                  </button>
                  <span>{seatsCount}</span>
                  <button type="button" onClick={() => changeSeats(1)}>
                    +
                  </button>
                </div>
              </div>

              <div className={styles.contactFields}>
                <input
                  type="text"
                  placeholder="שם מלא (איש/אשת קשר)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                <input
                  type="email"
                  placeholder="אימייל"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
                <input
                  type="tel"
                  placeholder="טלפון"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>

              <p className={styles.allergyWarning}>
                ⚠ שימו לב: אורח/ת עם אלרגיה למאכל מכל סוג מחויב/ת להגיע עם תרופה מתאימה בעצמו/ה —
                המקום אינו סטרילי.
              </p>

              <div className={styles.dinersList}>
                {diners.map((diner, i) => (
                  <div key={i} className={styles.dinerRow}>
                    <div className={styles.dinerRowLabel}>
                      סועד/ת {i + 1} <span className={styles.dinerRowRequired}>— שם מלא חובה</span>
                    </div>
                    <input
                      type="text"
                      placeholder="שם מלא"
                      value={diner.fullName}
                      onChange={(e) => updateDiner(i, { fullName: e.target.value })}
                    />
                    <div className={styles.restrictionChecks}>
                      {RESTRICTION_OPTIONS.map((option) => (
                        <label key={option} className={styles.restrictionChip}>
                          <input
                            type="checkbox"
                            checked={diner.dietaryRestrictions.includes(option)}
                            onChange={() => toggleRestriction(i, option)}
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="הערות נוספות (למשל: לא אוהב/ת עגבניה)"
                      value={diner.notes}
                      onChange={(e) => updateDiner(i, { notes: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.drawerFooter}>
              <div className={styles.totalsRow}>
                <span>מחיר לסועד</span>
                <span>{formatCurrency(selectedMeal.pricePerSeat)}</span>
              </div>
              <div className={styles.totalsRow}>
                <span>סה&quot;כ לארוחה</span>
                <span>{formatCurrency(mealTotal)}</span>
              </div>
              <div className={`${styles.totalsRow} ${styles.grand}`}>
                <span>מקדמה לתשלום עכשיו (₪100 לסועד)</span>
                <span>{formatCurrency(depositTotal)}</span>
              </div>
              <div className={styles.balanceNote}>
                היתרה ({formatCurrency(balance)}) תשולם במקום בערב הארוחה
              </div>
              {error && <p className={styles.error}>{error}</p>}
              <button
                type="button"
                className={styles.registerBtn}
                onClick={submit}
                disabled={submitting}
              >
                {submitting ? "מעבד..." : "שריינו מקום ושלמו מקדמה"}
              </button>
              <p className={styles.cancelNote}>
                ביטול חינם עד 96 שעות (4 ימים) לפני הארוחה — המקדמה מוחזרת במלואה
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
