"use client";

import { useMemo, useState } from "react";
import { getDict, type Locale } from "@/lib/dictionary";
import styles from "@/app/(site)/[locale]/events/page.module.css";

const HOURS = Array.from({ length: 16 }, (_, i) => `${String(i + 8).padStart(2, "0")}:00`);

type Location = "venue" | "other" | null;
type Format = "buffet" | "seated" | "other" | null;

export function EventsForm({ locale }: { locale: Locale }) {
  const [eventType, setEventType] = useState<string | null>(null);
  const [location, setLocation] = useState<Location>(null);
  const [format, setFormat] = useState<Format>(null);
  const [service, setService] = useState<string | null>(null);
  const [guests, setGuests] = useState(10);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const f = getDict(locale).events.form;

  const EVENT_TYPES = [
    { value: "family", label: f.eventTypes.family },
    { value: "corporate", label: f.eventTypes.corporate },
    { value: "wedding", label: f.eventTypes.wedding },
    { value: "birthday", label: f.eventTypes.birthday },
    { value: "holiday", label: f.eventTypes.holiday },
    { value: "bachelor", label: f.eventTypes.bachelor },
    { value: "barmitzvah", label: f.eventTypes.barmitzvah },
    { value: "other", label: f.eventTypes.other },
  ];

  function guestRange(loc: Location, fmt: Format): { min: number; max: number | null; label: string | null } {
    if (loc === "venue" && fmt === "seated") return { min: 10, max: 24, label: f.guestRangeLabelVenueSeated };
    if (loc === "venue" && fmt === "buffet") return { min: 10, max: 60, label: f.guestRangeLabelVenueBuffet };
    if (loc === "other" && fmt === "seated") return { min: 10, max: 30, label: f.guestRangeLabelOtherSeated };
    return { min: 10, max: null, label: null };
  }

  const range = useMemo(() => guestRange(location, format), [location, format]);

  function clamp(value: number): number {
    let v = value;
    if (v < range.min) v = range.min;
    if (range.max && v > range.max) v = range.max;
    return v;
  }

  function setGuestsClamped(value: number) {
    setGuests(clamp(value));
  }

  const guestNote = range.max
    ? f.guestRangeWithMax(range.min, range.max, range.label ?? "") +
      (location === "other" && guests > 30 ? f.guestRangeExtraStaff : "")
    : f.guestRangeNoMax(range.min);

  if (submitted) {
    return <p className={styles.successMsg}>{f.successMsg}</p>;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!eventType) return setError(f.errorEventType);
    if (!location) return setError(f.errorLocation);
    if (!format) return setError(f.errorFormat);

    const form = e.currentTarget;
    const data = new FormData(form);

    setSubmitting(true);
    try {
      const res = await fetch("/api/events/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          fullName: String(data.get("fullName") ?? ""),
          phone: String(data.get("phone") ?? ""),
          email: String(data.get("email") ?? ""),
          eventDate: String(data.get("date") ?? ""),
          startTime: String(data.get("startTime") ?? ""),
          locationType: location,
          locationDetail: String(data.get("locationDetail") ?? ""),
          format,
          serviceStyle: service ?? "",
          guestCount: guests,
          details: String(data.get("details") ?? ""),
          newsletterOptIn: data.get("newsletter") === "on",
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.ok) {
        setError(result.error ?? f.errorGeneric);
        return;
      }
      setSubmitted(true);
    } catch {
      setError(f.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label>
          {f.eventTypeLabel} <span className={styles.req}>*</span>
        </label>
        <div className={styles.chips}>
          {EVENT_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`${styles.chip} ${eventType === t.value ? styles.selected : ""}`}
              onClick={() => setEventType(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label htmlFor="fullName">
            {f.fullNameLabel} <span className={styles.req}>*</span>
          </label>
          <input id="fullName" name="fullName" type="text" required />
        </div>
        <div className={styles.field}>
          <label htmlFor="phone">
            {f.phoneLabel} <span className={styles.req}>*</span>
          </label>
          <input id="phone" name="phone" type="tel" required />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="email">
          {f.emailLabel} <span className={styles.req}>*</span>
        </label>
        <input id="email" name="email" type="email" required />
      </div>

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label htmlFor="date">{f.dateLabel}</label>
          <input id="date" name="date" type="date" />
        </div>
        <div className={styles.field}>
          <label htmlFor="startTime">{f.startTimeLabel}</label>
          <select id="startTime" name="startTime" defaultValue={HOURS[0]}>
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.field}>
        <label>
          {f.locationLabel} <span className={styles.req}>*</span>
        </label>
        <div className={styles.chips}>
          <button
            type="button"
            className={`${styles.chip} ${location === "venue" ? styles.selected : ""}`}
            onClick={() => setLocation("venue")}
          >
            {f.locationVenue}
          </button>
          <button
            type="button"
            className={`${styles.chip} ${location === "other" ? styles.selected : ""}`}
            onClick={() => setLocation("other")}
          >
            {f.locationOther}
          </button>
        </div>
        {location === "other" && (
          <input
            type="text"
            name="locationDetail"
            placeholder={f.locationDetailPlaceholder}
            style={{ marginTop: 6 }}
          />
        )}
        {location === "venue" && <p className={styles.fieldNote}>{f.venueNote}</p>}
      </div>

      <div className={styles.field}>
        <label>
          {f.formatLabel} <span className={styles.req}>*</span>
        </label>
        <div className={styles.chips}>
          <button
            type="button"
            className={`${styles.chip} ${format === "buffet" ? styles.selected : ""}`}
            onClick={() => setFormat("buffet")}
          >
            {f.formatBuffet}
          </button>
          <button
            type="button"
            className={`${styles.chip} ${format === "seated" ? styles.selected : ""}`}
            onClick={() => setFormat("seated")}
          >
            {f.formatSeated}
          </button>
          <button
            type="button"
            className={`${styles.chip} ${format === "other" ? styles.selected : ""}`}
            onClick={() => setFormat("other")}
          >
            {f.formatOther}
          </button>
        </div>
        {format === "seated" && (
          <div className={styles.chips} style={{ marginTop: 10 }}>
            <button
              type="button"
              className={`${styles.chip} ${service === "plated" ? styles.selected : ""}`}
              onClick={() => setService("plated")}
            >
              {f.servicePlated}
            </button>
            <button
              type="button"
              className={`${styles.chip} ${service === "family" ? styles.selected : ""}`}
              onClick={() => setService("family")}
            >
              {f.serviceFamily}
            </button>
          </div>
        )}
      </div>

      <div className={styles.field}>
        <label>{f.guestsLabel}</label>
        <div className={styles.guestStepper}>
          <button type="button" onClick={() => setGuestsClamped(guests - 1)}>
            −
          </button>
          <input
            type="number"
            value={guests}
            min={range.min}
            onChange={(e) => setGuestsClamped(Number(e.target.value) || range.min)}
          />
          <button type="button" onClick={() => setGuestsClamped(guests + 1)}>
            +
          </button>
        </div>
        <p className={styles.fieldNote}>{guestNote}</p>
      </div>

      <div className={styles.field}>
        <label htmlFor="details">{f.detailsLabel}</label>
        <textarea id="details" name="details" placeholder={f.detailsPlaceholder} />
      </div>

      <label className={styles.checkboxRow}>
        <input type="checkbox" name="newsletter" />
        <span>{f.newsletterLabel}</span>
      </label>

      <p className={styles.fieldNote}>{f.cleaningFeeNote}</p>

      {error && <p style={{ color: "var(--danger)", fontSize: 13.5 }}>{error}</p>}

      <button type="submit" className={styles.submitBtn} disabled={submitting}>
        {submitting ? f.submitting : f.submit}
      </button>
      <p className={styles.footnote}>{f.footnote}</p>
    </form>
  );
}
