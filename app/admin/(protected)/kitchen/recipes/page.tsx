import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { getKitchenGraph } from "@/lib/kitchen/data";
import { recipeBaseCost, recipeCostPerBaseUnit } from "@/lib/kitchen/algorithms";
import { formatCurrency } from "@/lib/pricing";
import { AdminSearchGrid } from "@/components/admin/kitchen/AdminSearch";
import styles from "../../../admin.module.css";

const TYPE_LABEL = { dish: "מנה סופית", prep: "הכנה" };

export default async function KitchenRecipesPage() {
  const admin = await requireAdmin();
  const isOwner = admin.role === "owner";
  const { recipesById, ingredientsById } = await getKitchenGraph();
  const recipes = Array.from(recipesById.values()).sort((a, b) => a.name.localeCompare(b.name, "he"));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>מתכונים</h1>
        {isOwner && (
          <Link href="/admin/kitchen/recipes/new" className={styles.btn}>
            מתכון חדש
          </Link>
        )}
      </div>
      {!isOwner && <p className={styles.muted}>צפייה בלבד.</p>}

      <AdminSearchGrid
        placeholder="חיפוש מתכון..."
        emptyMessage="אין מתכונים עדיין."
        items={recipes.map((r) => {
          const baseCost = isOwner ? recipeBaseCost(r.id, recipesById, ingredientsById) : 0;
          const perUnitCost = isOwner ? recipeCostPerBaseUnit(r.id, recipesById, ingredientsById) : 0;
          const card = (
            <div className={styles.card} style={{ height: "100%" }}>
              <span className={r.type === "dish" ? styles.badgePaid : styles.badgePending}>
                {TYPE_LABEL[r.type]}
              </span>
              <h2 style={{ marginTop: 10 }}>{r.name}</h2>
              <p className={styles.muted}>
                {r.baseAmount} {r.baseUnit} · {r.components.length} רכיבים · {r.prepSteps.length} שלבים
              </p>
              {isOwner && (
                <p className={styles.muted} style={{ marginTop: 6 }}>
                  עלות: {formatCurrency(baseCost)} סה&quot;כ · {formatCurrency(perUnitCost)} ל{r.baseUnit}
                </p>
              )}
            </div>
          );
          return {
            key: r.id,
            searchText: r.name,
            node: isOwner ? (
              <Link href={`/admin/kitchen/recipes/${r.id}`} style={{ display: "block" }}>
                {card}
              </Link>
            ) : (
              <div>{card}</div>
            ),
          };
        })}
      />
    </>
  );
}
