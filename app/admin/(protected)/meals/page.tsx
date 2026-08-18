import { requireAdminSection } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { closeMeal, createMeal, deleteMeal, reopenMeal } from "@/lib/actions/admin/meals";
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
import { NewRegistrationButton } from "@/components/admin/meals/NewRegistrationButton";
import { formatCurrency } from "@/lib/pricing";
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

export default async function AdminMealsPage() {
  const admin = await requireAdminSection("meals");
  const isOwner = admin.role === "owner";
  const db = supabaseAdmin();
  const { data: meals } = await db
    .from("meals")
    .select("id, title, description, date, total_seats, price_per_seat, status")
    .order("date", { ascending: true });

  const { data: registrations } = await db
    .from("meal_registrations")
    .select(
      "id, meal_id, customer_name, customer_email, customer_phone, status, meal_diners(id, full_name, dietary_restrictions, notes, deposit_paid)"
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
      diners: r.meal_diners.map((d) => ({
        id: d.id,
        fullName: d.full_name,
        restrictions: d.dietary_restrictions,
        notes: d.notes,
        paid: d.deposit_paid,
      })),
    });
    regsByMealId.set(r.meal_id, list);
  }

  const openMeals = (meals ?? []).filter((m) => m.status === "open");

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

      {(meals ?? []).map((meal) => {
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
                  {meal.status === "open" ? "פתוחה" : "סגורה"})
                </span>
              </h2>
              {isOwner && <NewRegistrationButton mealId={meal.id} mealTitle={meal.title} createAction={createManualRegistration} />}
            </div>

            <MealRegistrationsTable
              registrations={regs}
              otherMeals={otherMeals}
              isOwner={isOwner}
              actions={isOwner ? REGISTRATION_ACTIONS : undefined}
            />

            {isOwner && (
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
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
