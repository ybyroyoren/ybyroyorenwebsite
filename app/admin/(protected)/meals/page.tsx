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
  updateRegistrationPayment,
  addRegistrationPayment,
  markRegistrationPaidInFull,
  updateDiner,
  updateRegistrationContact,
} from "@/lib/actions/admin/meal-registrations";
import { MealRegistrationsTable, type RegistrationData } from "@/components/admin/meals/MealRegistrationsTable";
import { restrictionSummary } from "@/lib/restrictionSummary";
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
  updateRegistrationPayment,
  addRegistrationPayment,
  markRegistrationPaidInFull,
  moveDinerToMeal,
};

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
      "id, meal_id, customer_name, customer_email, customer_phone, status, source, occasions, occasion_other, extra_notes, seating_note, consented_at, deposit_discount, balance_discount, paid_amount, coupons(code), meal_diners(id, full_name, age, gender, dietary_restrictions, notes, favorite_foods, deposit_paid)"
    )
    .order("created_at", { ascending: false });

  const priceByMeal = new Map((meals ?? []).map((m) => [m.id as string, Number(m.price_per_seat)]));
  const regsByMealId = new Map<string, RegistrationData[]>();
  for (const r of registrations ?? []) {
    const list = regsByMealId.get(r.meal_id) ?? [];
    list.push({
      id: r.id,
      customerName: r.customer_name,
      customerEmail: r.customer_email,
      customerPhone: r.customer_phone,
      status: r.status,
      unpaidWebBooking: r.status === "pending" && r.source !== "admin",
      fromWeb: r.source !== "admin",
      occasions: r.occasions ?? [],
      occasionOther: r.occasion_other ?? "",
      extraNotes: r.extra_notes ?? "",
      seatingNote: r.seating_note ?? "",
      consentedAt: r.consented_at ?? null,
      couponCode: (r.coupons as unknown as { code: string } | null)?.code ?? null,
      depositDiscount: Number(r.deposit_discount ?? 0),
      balanceDiscount: Number(r.balance_discount ?? 0),
      paidAmount: Number(r.paid_amount ?? 0),
      pricePerSeat: priceByMeal.get(r.meal_id) ?? 0,
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
        const allRegs = regsByMealId.get(meal.id) ?? [];
        // A booking from the website that was never paid (the visitor left the payment page) is not a registration yet:
        // it is listed apart, below. Bookings you entered by hand count even before the deposit arrives.
        const regs = allRegs.filter((r) => !r.unpaidWebBooking);
        const unpaidWeb = allRegs.filter((r) => r.unpaidWebBooking);
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
              if (!summary) return null;
              // "×5 ללא הגבלות": each count sits on the right of what it counts (read right to left).
              return (
                <p dir="rtl" style={{ marginTop: 8, fontWeight: 600, textAlign: "right" }}>
                  הגבלות תזונה ({summary.total} סועדים):{" "}
                  {summary.groups.map((g, i) => (
                    <span key={g.label}>
                      {i > 0 && " · "}
                      <bdi dir="ltr">×{g.count}</bdi> <bdi dir="rtl">{g.label}</bdi>
                    </span>
                  ))}
                </p>
              );
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

            {unpaidWeb.length > 0 && (
              <details style={{ marginTop: 16 }}>
                <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                  התחילו הרשמה באתר ולא שילמו ({unpaidWeb.reduce((sum, r) => sum + r.diners.length, 0)} סועדים, {unpaidWeb.length} הזמנות)
                </summary>
                <p className={styles.muted} style={{ margin: "8px 0" }}>
                  אלה לא רשומים לארוחה ולא נספרים למעלה. המקומות שלהם נשמרים באתר 30 דקות מרגע ההתחלה, ואם התשלום לא הושלם הם משתחררים. אם התשלום נעשה
                  בכל זאת, ההרשמה עוברת לרשימה הראשית מעצמה. אפשר ליצור איתם קשר, או למחוק את הניסיון.
                </p>
                <MealRegistrationsTable
                  registrations={unpaidWeb}
                  otherMeals={otherMeals}
                  isOwner={isOwner}
                  actions={isOwner ? REGISTRATION_ACTIONS : undefined}
                />
              </details>
            )}

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
