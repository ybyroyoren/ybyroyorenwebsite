"use client";

import { useRef } from "react";
import { getDict, type Locale } from "@/lib/dictionary";
import { EventsForm } from "./EventsForm";
import styles from "./EventInquiry.module.css";

/** The big "let's plan your event" button; it opens the inquiry form in a dialog. */
export function EventInquiry({ locale }: { locale: Locale }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const t = getDict(locale).events;

  return (
    <>
      <button type="button" className={`ybtn ybtnGreen ${styles.open}`} onClick={() => dialogRef.current?.showModal()}>
        {t.ctaOpen}
      </button>
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby="event-inquiry-title"
        // A click on the dimmed backdrop (the dialog element itself) closes it.
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <div className={styles.inner}>
          <button type="button" className={styles.close} onClick={() => dialogRef.current?.close()} aria-label={t.closeForm}>
            ×
          </button>
          <h2 id="event-inquiry-title">{t.formHeading}</h2>
          <p className={styles.sub}>{t.formSub}</p>
          <EventsForm locale={locale} />
        </div>
      </dialog>
    </>
  );
}
