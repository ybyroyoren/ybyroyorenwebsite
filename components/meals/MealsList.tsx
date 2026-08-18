"use client";

import { useState } from "react";
import type { MealView, DinerInput } from "@/lib/meals";
import { seatsLabel, seatsDisplayPct, isLowSeats } from "@/lib/seats";
import { formatCurrency } from "@/lib/pricing";
import { formatMealDateParts, formatMealDateFull } from "@/lib/date";
import { getDict, type Locale } from "@/lib/dictionary";
import styles from "./MealsList.module.css";

const DEPOSIT_PER_SEAT = 100;

function emptyDiner(): DinerInput {
  return { fullName: "", dietaryRestrictions: [], notes: "" };
}

export function MealsList({ meals, locale }: { meals: MealView[]; locale: Locale }) {
  const [selectedMeal, setSelectedMeal] = useState<MealView | null>(null);
  const [seatsCount, setSeatsCount] = useState(1);
  const [diners, setDiners] = useState<DinerInput[]>([emptyDiner()]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const t = getDict(locale).meals;
  const d = t.drawer;
  const RESTRICTION_OPTIONS = d.restrictions;

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
      setError(d.errorMissingContact);
      return;
    }
    if (diners.some((diner) => !diner.fullName.trim())) {
      setError(d.errorMissingDinerName);
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
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? d.errorGeneric);
        return;
      }
      window.location.href = data.paymentUrl;
    } catch {
      setError(d.errorGeneric);
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
        const { day, num, month } = formatMealDateParts(meal.date, locale);
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
                {seatsLabel(meal.remainingSeats, locale)}
              </div>
            </div>
            <div className={styles.ctaCol}>
              <div className={styles.price}>
                {t.pricePerSeat}
                <br />
                <b>{formatCurrency(meal.pricePerSeat)}</b>
              </div>
              {isFull ? (
                <span className={styles.fullBadge}>{t.full}</span>
              ) : (
                <span className={styles.btn}>{t.detailsCta}</span>
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
                <div className={styles.dayTag}>{formatMealDateFull(selectedMeal.date, locale)}</div>
                <h3>{selectedMeal.title}</h3>
              </div>
              <button type="button" className={styles.close} onClick={closeDrawer}>
                ✕
              </button>
            </div>
            <div className={styles.drawerBody}>
              <p className={styles.summary}>{d.summary}</p>

              <div className={styles.seatsPicker}>
                <div className={styles.seatsPickerLabel}>
                  {d.seatsPickerLabel}
                  <small>{seatsLabel(selectedMeal.remainingSeats, locale)}</small>
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
                  placeholder={d.namePlaceholder}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                <input
                  type="email"
                  placeholder={d.emailPlaceholder}
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
                <input
                  type="tel"
                  placeholder={d.phonePlaceholder}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>

              <p className={styles.allergyWarning}>{d.allergyWarning}</p>

              <div className={styles.dinersList}>
                {diners.map((diner, i) => (
                  <div key={i} className={styles.dinerRow}>
                    <div className={styles.dinerRowLabel}>
                      {d.dinerLabel(i + 1)} <span className={styles.dinerRowRequired}>{d.dinerRequired}</span>
                    </div>
                    <input
                      type="text"
                      placeholder={d.dinerNamePlaceholder}
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
                      placeholder={d.dinerNotesPlaceholder}
                      value={diner.notes}
                      onChange={(e) => updateDiner(i, { notes: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.drawerFooter}>
              <div className={styles.totalsRow}>
                <span>{t.pricePerSeat}</span>
                <span>{formatCurrency(selectedMeal.pricePerSeat)}</span>
              </div>
              <div className={styles.totalsRow}>
                <span>{d.totalForMeal}</span>
                <span>{formatCurrency(mealTotal)}</span>
              </div>
              <div className={`${styles.totalsRow} ${styles.grand}`}>
                <span>{d.depositNow}</span>
                <span>{formatCurrency(depositTotal)}</span>
              </div>
              <div className={styles.balanceNote}>{d.balanceNote(formatCurrency(balance))}</div>
              {error && <p className={styles.error}>{error}</p>}
              <button
                type="button"
                className={styles.registerBtn}
                onClick={submit}
                disabled={submitting}
              >
                {submitting ? d.submitting : d.registerBtn}
              </button>
              <p className={styles.cancelNote}>{d.cancelNote}</p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
