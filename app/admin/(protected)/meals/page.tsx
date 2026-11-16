import { requireAdminSection } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { closeMeal, createMeal, deleteMeal, reopenMeal, setRegistrationClosed, updateMealDisplay } from "@/lib/actions/admin/meals";
import {
  addDinerToRegistration,
  createManualRegistration,
  deleteDiner,
  deleteRegistration,
  moveDinerToMeal,
  moveRegistrationToMeal,
  toggleDinerPaid,
  updateDiner,
  updateRegistrationContact,
} from "@/lib/actions/admin/meal-registrations";
import { MealRegistrationsTable, type RegistrationData } from "@/components/admin/meals/MealRegistrationsTable";
import { MealSeatsDisplay } from "@/components/admin/meals/MealSeatsDisplay";
import { NewRegistrationButton } from "@/components/admin/meals/NewRegistrationButton";
import { formatCurrency } from "@/lib/pricing";
import { todayIsraelIso } from "@/lib/date";
import { AdminTabs } from "@/components/admin/AdminTabs";
import styles from "../../admin.module.css";

const REGISTRATION_ACTIONS = {
  updateRegistrationContact,
  deleteRegistration,
  moveRegistrationToMeal,
  addDinerToRegistration,
  updateDiner,
  deleteDiner,
  toggleDinerPaid,
  moveDinerToMeal,
};

/**
 * One line for the kitchen: how many diners have each dietary restriction (cancelled bookings excluded), e.g.
 * "צמחוני ×3 · ללא גלוטן ×2 · אחר ×1 (לא אוהב בצל) · ללא הגבלות ×9". Null when nobody has registered.
 */
function restrictionSummary(regs: RegistrationData[]): string | null {
  const counts = new Map<string, number>();
  const otherNotes: string[] = [];
  let total = 0;
  for (const reg of regs) {
    if (reg.status === "cancelled") continue;
    for (const diner of reg.diners) {
      total++;
      for (const label of diner.restrictions) {
        const key = label.startsWith("אחר") ? "אחר" : label;
        counts.set(key, (counts.get(key) ?? 0) + 1);
        if (key === "אחר" && diner.notes.trim()) otherNotes.push(diner.notes.trim());
      }
    }
  }
  if (total === 0) return null;
  const none = counts.get("ללא הגבלות") ?? 0;
  counts.delete("ללא הגבלות");
  const parts = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, n]) => `${label} ×${n}${label === "אחר" && otherNotes.length > 0 ? ` (${otherNotes.join("; ")})` : ""}`);
  if (none > 0) parts.push(`ללא הגבלות ×${none}`);
  return parts.length > 0 ? `הגבלות תזונה (${total} סועדים): ${parts.join(" · ")}` : null;
}

export default async function AdminMealsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const activeTab = tab === "archive" ? "archive" : "active";
  const admin = await requireAdminSection("meals");
  const isOwner = admin.role === "owner";
  const db = supabaseAdmin();
  const { data: meals } = await db
    .from("meals")
    .select("id, title, description, date, total_seats, price_per_seat, status, seats_text_mode, seats_text_he, seats_text_en, seats_meter_mode, registration_closed")
    .order("date", { ascending: true });

  // The seat numbers the public page uses (see meal_availability).
  const { data: availability } = await db.from("meal_availability").select("meal_id, taken_seats, remaining_seats");
  const availabilityByMeal = new Map((availability ?? []).map((a) => [a.meal_id, a]));

  const { data: registrations } = await db
    .from("meal_registrations")
    .select(
      "id, meal_id, customer_name, customer_email, customer_phone, status, occasions, occasion_other, extra_notes, seating_note, meal_diners(id, full_name, age, gender, dietary_restrictions, notes, favorite_foods, deposit_paid)"
    )
    .order("created_at", { ascending: false });

  const regsByMealId = new Map<string, RegistrationData[]>();
  for (const r of registrations ?? []) {
    const list = regsByMealId.get(r.meal_id) ?? [];
    list.push({
      id: r.id,
      customerName: r.customer_name,
      customerEmail: r.customer_email,
      customerPhone: r.customer_phone,
      status: r.status,
      occasions: r.occasions ?? [],
      occasionOther: r.occasion_other ?? "",
      extraNotes: r.extra_notes ?? "",
      seatingNote: r.seating_note ?? "",
      diners: r.meal_diners.map((d) => ({
        id: d.id,
        fullName: d.full_name,
        age: d.age,
        gender: d.gender,
        restrictions: d.dietary_restrictions,
        notes: d.notes,
        favorites: d.favorite_foods ?? "",
        paid: d.deposit_paid,
      })),
    });
    regsByMealId.set(r.meal_id, list);
  }

  // A meal leaves the active tab once it has been closed or its date has passed.
  const today = todayIsraelIso();
  const isArchived = (m: { status: string; date: string }) => m.status !== "open" || m.date < today;
  const allMeals = meals ?? [];
  const activeMeals = allMeals.filter((m) => !isArchived(m));
  // Newest first in the archive; soonest first in the active tab.
  const archivedMeals = allMeals.filter(isArchived).sort((a, b) => (a.date < b.date ? 1 : -1));
  const shownMeals = activeTab === "archive" ? archivedMeals : activeMeals;
  // Registrations can only be moved to a meal that is still taking guests.
  const openMeals = activeMeals;

  return (
    <>
      <h1>ארוחות פתוחות</h1>
      {!isOwner && <p className={styles.muted}>צפייה בהרשמות והגבלות תזונה בלבד.</p>}

      {isOwner && (
        <div className={styles.card}>
          <h2>ארוחה חדשה</h2>
          <form action={createMeal} className={styles.form}>
            <div className={styles.field}>
              <label>כותרת</label>
              <input name="title" type="text" required />
            </div>
            <div className={styles.field}>
              <label>תיאור</label>
              <input name="description" type="text" />
            </div>
            <div className={styles.field}>
              <label>תאריך</label>
              <input name="date" type="date" required />
            </div>
            <div className={styles.field}>
              <label>מקומות</label>
              <input name="totalSeats" type="number" min="1" required style={{ width: 80 }} />
            </div>
            <div className={styles.field}>
              <label>מחיר לסועד</label>
              <input name="pricePerSeat" type="number" min="0" step="0.01" required style={{ width: 100 }} />
            </div>
            <div className={styles.field} style={{ width: "100%" }}>
              <label>תפריט (שורה לכל מנה)</label>
              <textarea name="menu" rows={3} style={{ width: "100%" }} />
            </div>
            <button type="submit" className={styles.btn}>
              פתיחת ארוחה
            </button>
          </form>
        </div>
      )}

      <AdminTabs
        basePath="/admin/meals"
        active={activeTab}
        tabs={[
          { key: "active", label: "פעילות", count: activeMeals.length },
          { key: "archive", label: "סגורות ושעברו", count: archivedMeals.length },
        ]}
      />

      {shownMeals.length === 0 && (
        <p className={styles.muted}>
          {activeTab === "archive" ? "אין ארוחות סגורות או שעברו." : "אין ארוחות פעילות. אפשר לפתוח ארוחה חדשה למעלה."}
        </p>
      )}

      {shownMeals.map((meal) => {
        const regs = regsByMealId.get(meal.id) ?? [];
        // Counts everyone registered (including deposit still pending) —
        // the public meal_availability view only counts paid diners, which
        // undercounts for planning purposes here.
        const registeredCount = regs
          .filter((r) => r.status !== "cancelled")
          .reduce((sum, r) => sum + r.diners.length, 0);
        const otherMeals = openMeals.filter((m) => m.id !== meal.id).map((m) => ({ id: m.id, title: m.title, date: m.date }));
        return (
          <div key={meal.id} className={styles.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <h2>
                {meal.title} — {meal.date}{" "}
                <span className={styles.muted}>
                  ({registeredCount}/{meal.total_seats} רשומים ·{" "}
                  {formatCurrency(meal.price_per_seat)} לסועד ·{" "}
                  {meal.status !== "open" ? "סגורה" : meal.date < today ? "עברה" : "פתוחה"})
                </span>
                {meal.registration_closed && meal.status === "open" && (
                  <span className={styles.badgePending} style={{ marginInlineStart: 8 }}>
                    ההרשמה סגורה (מוצגת כמלאה)
                  </span>
                )}
              </h2>
              {isOwner && <NewRegistrationButton mealId={meal.id} mealTitle={meal.title} createAction={createManualRegistration} />}
            </div>

            {(() => {
              const summary = restrictionSummary(regs);
              return summary ? <p style={{ marginTop: 8, fontWeight: 600 }}>{summary}</p> : null;
            })()}

            {isOwner && (
              <MealSeatsDisplay
                mealId={meal.id}
                total={meal.total_seats}
                taken={availabilityByMeal.get(meal.id)?.taken_seats ?? 0}
                remaining={availabilityByMeal.get(meal.id)?.remaining_seats ?? meal.total_seats}
                registrationClosed={meal.registration_closed}
                initial={{ textMode: meal.seats_text_mode, textHe: meal.seats_text_he, textEn: meal.seats_text_en, meterMode: meal.seats_meter_mode }}
                saveAction={updateMealDisplay}
              />
            )}

            <MealRegistrationsTable
              registrations={regs}
              otherMeals={otherMeals}
              isOwner={isOwner}
              actions={isOwner ? REGISTRATION_ACTIONS : undefined}
            />

            {isOwner && (
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                {meal.status === "open" && (
                  <form action={setRegistrationClosed}>
                    <input type="hidden" name="id" value={meal.id} />
                    <input type="hidden" name="closed" value={meal.registration_closed ? "false" : "true"} />
                    <button type="submit" className={styles.btnSecondary} title="הארוחה נשארת באתר ומוצגת כמלאה, ואי אפשר להירשם אליה. אפשר לפתוח שוב בכל רגע">
                      {meal.registration_closed ? "פתיחת הרשמה מחדש" : "סגירת הרשמה (הארוחה תוצג כמלאה)"}
                    </button>
                  </form>
                )}
                {meal.status === "open" ? (
                  <form action={closeMeal}>
                    <input type="hidden" name="id" value={meal.id} />
                    <button type="submit" className={styles.btnSecondary}>
                      סגירת ארוחה
                    </button>
                  </form>
                ) : (
                  <form action={reopenMeal}>
                    <input type="hidden" name="id" value={meal.id} />
                    <button type="submit" className={styles.btnSecondary}>
                      פתיחה מחדש
                    </button>
                  </form>
                )}
                <form action={deleteMeal}>
                  <input type="hidden" name="id" value={meal.id} />
                  <button type="submit" className={styles.btnDanger}>
                    מחיקת ארוחה
                  </button>
                </form>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
