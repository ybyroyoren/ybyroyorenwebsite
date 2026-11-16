"use client";

import { track } from "@/lib/analytics/client";
import { useState } from "react";
import type { MealView } from "@/lib/meals";
import { GENDERS, NO_RESTRICTIONS, OCCASIONS, OTHER_OCCASION, OTHER_RESTRICTION, RESTRICTIONS, label, type Gender } from "@/lib/mealForm";
import { seatsDisplay } from "@/lib/seats";
import { formatCurrency } from "@/lib/pricing";
import { formatMealDateParts, formatMealDateFull } from "@/lib/date";
import { getDict, type Locale } from "@/lib/dictionary";
import styles from "./MealsList.module.css";

const DEPOSIT_PER_SEAT = 100;

interface DinerForm {
  firstName: string;
  lastName: string;
  age: string;
  gender: Gender | "";
  restrictions: string[];
  notes: string;
  favorites: string;
}

function emptyDiner(): DinerForm {
  return { firstName: "", lastName: "", age: "", gender: "", restrictions: [], notes: "", favorites: "" };
}

export function MealsList({ meals, locale }: { meals: MealView[]; locale: Locale }) {
  const [selectedMeal, setSelectedMeal] = useState<MealView | null>(null);
  const [seatsCount, setSeatsCount] = useState(1);
  const [diners, setDiners] = useState<DinerForm[]>([emptyDiner()]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [occasions, setOccasions] = useState<string[]>([]);
  const [occasionOther, setOccasionOther] = useState("");
  const [extraNotes, setExtraNotes] = useState("");
  const [seatingNote, setSeatingNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; pct: number } | null>(null);
  const [couponMessage, setCouponMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const t = getDict(locale).meals;
  const d = t.drawer;

  function openMeal(meal: MealView) {
    track("meal_register_open", { meal_date: meal.date, remaining: meal.remainingSeats });
    setSelectedMeal(meal);
    setSeatsCount(1);
    setDiners([emptyDiner()]);
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setOccasions([]);
    setOccasionOther("");
    setExtraNotes("");
    setSeatingNote("");
    setConsent(false);
    setCouponInput("");
    setCoupon(null);
    setCouponMessage(null);
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

  function updateDiner(index: number, patch: Partial<DinerForm>) {
    setDiners((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code) {
      setCoupon(null);
      setCouponMessage(null);
      return;
    }
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, scope: "meals" }),
      });
      const data = await res.json();
      if (data.valid) {
        setCoupon({ code: code.toUpperCase(), pct: data.discountPct });
        setCouponMessage({ text: data.message, ok: true });
      } else {
        setCoupon(null);
        setCouponMessage({ text: data.message || d.errorGeneric, ok: false });
      }
    } catch {
      setCouponMessage({ text: d.errorGeneric, ok: false });
    }
  }

  /** Fills a diner's name from the contact person's name (first word = first name, the rest = last name). */
  function fillFromContact(index: number) {
    const parts = customerName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return;
    updateDiner(index, { firstName: parts[0], lastName: parts.slice(1).join(" ") });
  }

  /** "No restrictions" excludes every other choice; any other choice clears it. The rest combine freely. */
  function toggleRestriction(index: number, key: string) {
    setDiners((prev) =>
      prev.map((diner, i) => {
        if (i !== index) return diner;
        if (key === NO_RESTRICTIONS) {
          return { ...diner, restrictions: diner.restrictions.includes(NO_RESTRICTIONS) ? [] : [NO_RESTRICTIONS] };
        }
        const rest = diner.restrictions.filter((k) => k !== NO_RESTRICTIONS);
        return { ...diner, restrictions: rest.includes(key) ? rest.filter((k) => k !== key) : [...rest, key] };
      })
    );
  }

  function toggleOccasion(key: string) {
    setOccasions((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  /** The first missing detail, worded for the visitor, or null when everything required is filled in. */
  function dinerError(): string | null {
    for (let i = 0; i < diners.length; i++) {
      const diner = diners[i];
      const prefix = d.dinerErrorPrefix(i + 1);
      const age = Number(diner.age);
      if (!diner.firstName.trim()) return prefix + d.dinerErrors.firstName;
      if (!diner.lastName.trim()) return prefix + d.dinerErrors.lastName;
      if (!Number.isInteger(age) || age < 1 || age > 120) return prefix + d.dinerErrors.age;
      if (!diner.gender) return prefix + d.dinerErrors.gender;
      if (diner.restrictions.length === 0) return prefix + d.dinerErrors.restrictions;
      if (diner.restrictions.includes(OTHER_RESTRICTION) && !diner.notes.trim()) return prefix + d.dinerErrors.other;
    }
    return null;
  }

  async function submit() {
    if (!selectedMeal) return;
    if (!customerName.trim() || !customerEmail.trim() || !customerPhone.trim()) {
      setError(d.errorMissingContact);
      return;
    }
    const problem = dinerError();
    if (problem) {
      setError(problem);
      return;
    }
    if (!consent) {
      setError(d.errorConsent);
      return;
    }

    setSubmitting(true);
    setError(null);
    track("meal_register_submit", { meal_date: selectedMeal.date, seats: seatsCount }, { value: seatsCount });
    try {
      const res = await fetch("/api/meals/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealId: selectedMeal.id,
          customerName,
          customerEmail,
          customerPhone,
          diners: diners.map((diner) => ({ ...diner, age: Number(diner.age) })),
          extras: { occasions, occasionOther: occasions.includes(OTHER_OCCASION) ? occasionOther : "", extraNotes, seatingNote, consent },
          couponCode: coupon?.code ?? "",
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? d.errorGeneric);
        return;
      }
      window.location.assign(data.paymentUrl);
    } catch {
      setError(d.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  const mealTotal = selectedMeal ? selectedMeal.pricePerSeat * seatsCount : 0;
  const fullDeposit = DEPOSIT_PER_SEAT * seatsCount;
  const couponDiscount = coupon ? Math.round(fullDeposit * coupon.pct * 100) / 100 : 0;
  const depositTotal = Math.max(0, fullDeposit - couponDiscount);
  // The coupon is a real discount: what is left to pay at the table does not grow when the deposit shrinks.
  const balance = mealTotal - fullDeposit;

  return (
    <>
      {meals.map((m, index) => {
        const meal = { ...m, display: seatsDisplay({ remaining: m.remainingSeats, total: m.totalSeats, taken: m.takenSeats, textMode: m.seatsTextMode, registrationClosed: m.registrationClosed, textHe: m.seatsTextHe, textEn: m.seatsTextEn, meterMode: m.seatsMeterMode }, locale) };
        const display = meal.display;
        const isFull = display.closed;
        const { day, num, month } = formatMealDateParts(meal.date, locale);
        return (
          <div
            key={meal.id}
            className={`${styles.card} ${isFull ? styles.full : ""} ${index < 2 ? "enter" : ""}`}
            {...(index >= 2 ? { "data-reveal": "" } : {})}
            style={index < 2 ? ({ "--i": index + 2 } as React.CSSProperties) : undefined}
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
              {display.pct !== null && (
                <div className={styles.seatsBar}>
                  <div className={styles.seatsBarFill} style={{ width: `${display.pct}%` }} />
                </div>
              )}
              {display.label !== null && <div className={`${styles.seatsText} ${display.low ? styles.low : ""}`}>{display.label}</div>}
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
                <span className={`ybtn ${styles.btn}`}>{t.detailsCta}</span>
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
                {diners.map((diner, i) => {
                  const noneChosen = diner.restrictions.includes(NO_RESTRICTIONS);
                  const otherChosen = diner.restrictions.includes(OTHER_RESTRICTION);
                  return (
                    <div key={i} className={styles.dinerRow}>
                      <div className={styles.dinerRowLabel}>
                        {d.dinerLabel(i + 1)} <span className={styles.dinerRowRequired}>{d.dinerRequired}</span>
                        {i === 0 && customerName.trim() && (
                          <button type="button" className={styles.selfBtn} title={d.selfHint} onClick={() => fillFromContact(0)}>
                            {d.selfButton}
                          </button>
                        )}
                      </div>
                      <div className={styles.dinerGrid}>
                        <input
                          type="text"
                          autoComplete="off"
                          placeholder={d.firstNamePlaceholder}
                          value={diner.firstName}
                          onChange={(e) => updateDiner(i, { firstName: e.target.value })}
                        />
                        <input
                          type="text"
                          autoComplete="off"
                          placeholder={d.lastNamePlaceholder}
                          value={diner.lastName}
                          onChange={(e) => updateDiner(i, { lastName: e.target.value })}
                        />
                      </div>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={120}
                        className={styles.ageInput}
                        placeholder={d.agePlaceholder}
                        value={diner.age}
                        onChange={(e) => updateDiner(i, { age: e.target.value })}
                      />
                      <div className={styles.fieldLabel}>{d.genderLabel}:</div>
                      <div className={styles.genderChips} role="radiogroup" aria-label={d.genderLabel}>
                        {GENDERS.map((g) => (
                          <label key={g.key} className={styles.restrictionChip}>
                            <input
                              type="radio"
                              name={`gender-${i}`}
                              checked={diner.gender === g.key}
                              onChange={() => updateDiner(i, { gender: g.key })}
                            />
                            {label(g, locale)}
                          </label>
                        ))}
                      </div>
                      <div className={styles.fieldLabel}>{d.restrictionsLabel}</div>
                      <div className={styles.restrictionChecks}>
                        {RESTRICTIONS.map((option) => {
                          const disabled = noneChosen && option.key !== NO_RESTRICTIONS;
                          return (
                            <label key={option.key} className={`${styles.restrictionChip} ${disabled ? styles.chipDisabled : ""}`}>
                              <input
                                type="checkbox"
                                checked={diner.restrictions.includes(option.key)}
                                disabled={disabled}
                                onChange={() => toggleRestriction(i, option.key)}
                              />
                              {label(option, locale)}
                            </label>
                          );
                        })}
                      </div>
                      <input
                        type="text"
                        placeholder={otherChosen ? d.otherNotesPlaceholder : d.dinerNotesPlaceholder}
                        value={diner.notes}
                        onChange={(e) => updateDiner(i, { notes: e.target.value })}
                      />
                      <div className={styles.fieldLabel} style={{ marginTop: 4 }}>
                        {d.favoritesLabel} <span className={styles.optional}>{d.optional}</span>
                      </div>
                      <input
                        type="text"
                        placeholder={d.favoritesPlaceholder}
                        value={diner.favorites}
                        onChange={(e) => updateDiner(i, { favorites: e.target.value })}
                      />
                      <p className={styles.favoritesHint}>{d.favoritesHint}</p>
                    </div>
                  );
                })}
              </div>

              <div className={styles.extras}>
                <div className={styles.fieldLabel}>
                  {d.occasionsHeading} <span className={styles.optional}>{d.optional}</span>
                </div>
                <div className={styles.restrictionChecks}>
                  {OCCASIONS.map((option) => (
                    <label key={option.key} className={styles.restrictionChip}>
                      <input type="checkbox" checked={occasions.includes(option.key)} onChange={() => toggleOccasion(option.key)} />
                      {label(option, locale)}
                    </label>
                  ))}
                </div>
                {occasions.includes(OTHER_OCCASION) && (
                  <input
                    type="text"
                    className={styles.extrasInput}
                    placeholder={d.occasionOtherPlaceholder}
                    value={occasionOther}
                    onChange={(e) => setOccasionOther(e.target.value)}
                  />
                )}
                <div className={styles.fieldLabel} style={{ marginTop: 14 }}>
                  {d.extraHeading} <span className={styles.optional}>{d.optional}</span>
                </div>
                <textarea
                  className={styles.extrasInput}
                  rows={3}
                  placeholder={d.extraPlaceholder}
                  value={extraNotes}
                  onChange={(e) => setExtraNotes(e.target.value)}
                />
                <div className={styles.fieldLabel} style={{ marginTop: 14 }}>
                  {d.seatingHeading} <span className={styles.optional}>{d.optional}</span>
                </div>
                <input
                  type="text"
                  className={styles.extrasInput}
                  placeholder={d.seatingPlaceholder}
                  value={seatingNote}
                  onChange={(e) => setSeatingNote(e.target.value)}
                />
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
              <div className={styles.couponRow}>
                <input
                  type="text"
                  placeholder={d.couponPlaceholder}
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyCoupon();
                    }
                  }}
                />
                <button type="button" onClick={applyCoupon}>
                  {d.couponApply}
                </button>
              </div>
              {couponMessage && <p className={`${styles.couponMsg} ${couponMessage.ok ? styles.couponOk : styles.error}`}>{couponMessage.text}</p>}
              {couponDiscount > 0 && (
                <div className={styles.totalsRow}>
                  <span>{d.couponDiscount}</span>
                  <span>-{formatCurrency(couponDiscount)}</span>
                </div>
              )}
              <div className={`${styles.totalsRow} ${styles.grand}`}>
                <span>{d.depositNow}</span>
                <span>{depositTotal > 0 ? formatCurrency(depositTotal) : d.depositFree}</span>
              </div>
              <div className={styles.balanceNote}>{d.balanceNote(formatCurrency(balance))}</div>
              <label className={styles.consent}>
                <input type="checkbox" checked={consent} onChange={(e) => {
                    setConsent(e.target.checked);
                    if (e.target.checked) setError(null);
                  }} />
                <span>{d.consentLabel}</span>
              </label>
              {error && <p className={styles.error}>{error}</p>}
              <button
                type="button"
                className={`ybtn ${styles.registerBtn}`}
                onClick={submit}
                disabled={submitting}
              >
                {submitting ? d.submitting : depositTotal > 0 ? d.registerBtn : d.registerBtnFree}
              </button>
              <p className={styles.cancelNote}>{d.cancelNote}</p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
