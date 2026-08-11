import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { getCompletedItemKeys, getEventById, getGuestsList, getKitchenGraph } from "@/lib/kitchen/data";
import {
  aggregateIngredientsForMenu,
  buildBringItems,
  buildEquipmentList,
  buildPrepForest,
  buildShoppingList,
  eventCostBreakdown,
  type PrepTreeNode,
} from "@/lib/kitchen/algorithms";
import { buildSummaryText } from "@/lib/kitchen/summaryText";
import { toggleCompletedItem } from "@/lib/actions/admin/kitchen-checklist";
import { CopySummaryButton } from "@/components/admin/kitchen/CopySummaryButton";
import { PrintButton } from "@/components/admin/kitchen/PrintButton";
import { formatCurrency } from "@/lib/pricing";
import adminStyles from "../../../../../admin.module.css";
import styles from "./summary.module.css";

function CheckRow({
  eventId,
  itemKey,
  done,
  label,
  qualifier,
  amount,
}: {
  eventId: string;
  itemKey: string;
  done: boolean;
  label: string;
  qualifier?: string;
  amount?: string;
}) {
  return (
    <form action={toggleCompletedItem} className={`${styles.checkRow} ${done ? styles.done : ""}`}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="itemKey" value={itemKey} />
      <input type="hidden" name="done" value={done ? "1" : "0"} />
      <div className={styles.checkMain}>
        <button type="submit" aria-label={done ? "בטל סימון" : "סמן כבוצע"}>
          {done ? "✓" : ""}
        </button>
        <span>
          {label}
          {qualifier && <span className={styles.checkQualifier}> ({qualifier})</span>}
        </span>
      </div>
      {amount && <span className={styles.checkAmount}>{amount}</span>}
    </form>
  );
}

function PrepNode({ node, eventId, completed, depth }: { node: PrepTreeNode; eventId: string; completed: Set<string>; depth: number }) {
  if (node.isReference) {
    return (
      <div className={styles.prepNode} style={{ marginRight: depth * 20 }}>
        <p className={adminStyles.muted}>
          ↳ {node.recipe.name} — פורט למעלה ({node.totalAmount} {node.recipe.baseUnit})
        </p>
      </div>
    );
  }

  const blockKey = `recipe:${node.recipeId}`;
  return (
    <div className={styles.prepNode} style={{ marginRight: depth * 20 }}>
      <CheckRow
        eventId={eventId}
        itemKey={blockKey}
        done={completed.has(blockKey)}
        label={node.recipe.name}
        qualifier={`${node.totalAmount} ${node.recipe.baseUnit}`}
      />
      {node.recipe.prepSteps.length > 0 && (
        <div className={styles.prepSteps}>
          {node.recipe.prepSteps.map((step, i) => {
            const stepKey = `step:${node.recipeId}:${step.id}`;
            return (
              <CheckRow
                key={step.id}
                eventId={eventId}
                itemKey={stepKey}
                done={completed.has(stepKey)}
                label={`${i + 1}. ${step.text}`}
              />
            );
          })}
        </div>
      )}
      {node.children.map((child) => (
        <PrepNode key={child.recipeId} node={child} eventId={eventId} completed={completed} depth={depth + 1} />
      ))}
    </div>
  );
}

export default async function EventSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const isOwner = admin.role === "owner";

  const { id } = await params;
  const [event, graph, guests, completed] = await Promise.all([
    getEventById(id),
    getKitchenGraph(),
    getGuestsList(),
    getCompletedItemKeys(id),
  ]);
  if (!event) notFound();

  const { recipesById, ingredientsById, suppliersById, equipmentById } = graph;
  const guestsById = new Map(guests.map((g) => [g.id, g]));

  const netTotals = aggregateIngredientsForMenu(event.menu, recipesById);
  const shoppingGroups = buildShoppingList(netTotals, ingredientsById, suppliersById);
  const prepForest = buildPrepForest(event.menu, recipesById);
  const isOffsite = event.eventType === "offsite";
  const equipmentRows = isOffsite ? buildEquipmentList(event.menu, recipesById, equipmentById) : [];
  const bringItems = isOffsite ? buildBringItems(event.menu, recipesById, ingredientsById) : [];
  const cost = isOwner ? eventCostBreakdown(event.menu, recipesById, ingredientsById) : null;

  const summaryText = buildSummaryText(event, guestsById, shoppingGroups, prepForest, equipmentRows, bringItems, cost);
  const assignedSeats = event.seats.filter((s) => s.guestId);

  return (
    <>
      <div className={styles.head}>
        <div>
          <h1>{event.name}</h1>
          <p className={styles.meta}>
            {event.date ?? "ללא תאריך"} · {isOffsite ? "אירוע חוץ" : "אצלנו"} · {event.location || "—"} ·{" "}
            {event.guestCount} סועדים
          </p>
        </div>
        <div className={styles.actions}>
          <CopySummaryButton text={summaryText} />
          <PrintButton />
          {isOwner && (
            <Link href={`/admin/kitchen/events/${id}`} className={adminStyles.btnSecondary}>
              עריכת אירוע
            </Link>
          )}
        </div>
      </div>

      {event.notes && (
        <div className={styles.section}>
          <h2>הערות</h2>
          <p>{event.notes}</p>
        </div>
      )}

      {assignedSeats.length > 0 && (
        <div className={styles.section}>
          <h2>סועדים</h2>
          <table className={styles.guestTable}>
            <tbody>
              {assignedSeats.map((seat) => {
                const guest = seat.guestId ? guestsById.get(seat.guestId) : null;
                if (!guest) return null;
                return (
                  <tr key={seat.seatIndex}>
                    <td>{guest.name}</td>
                    <td>{guest.phone || "—"}</td>
                    <td style={{ color: guest.restrictions ? "var(--danger)" : undefined, fontWeight: guest.restrictions ? 600 : 400 }}>
                      {guest.restrictions || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className={styles.section}>
        <h2>רשימת קניות</h2>
        {shoppingGroups.map((g) => (
          <div key={g.supplierId ?? "none"} className={styles.supplierGroup}>
            <h3>{g.supplierName}</h3>
            {g.rows.map((r) => {
              const key = `shopping:${r.ingredientId}`;
              return (
                <CheckRow
                  key={r.ingredientId}
                  eventId={id}
                  itemKey={key}
                  done={completed.has(key)}
                  label={r.displayName}
                  amount={`${r.purchaseAmount.toFixed(1)} ${r.displayUnit}`}
                />
              );
            })}
          </div>
        ))}
        {shoppingGroups.length === 0 && <p className={adminStyles.muted}>אין פריטים בתפריט האירוע.</p>}
      </div>

      <div className={styles.section}>
        <h2>רשימת הכנות</h2>
        {prepForest.map((node) => (
          <PrepNode key={node.recipeId} node={node} eventId={id} completed={completed} depth={0} />
        ))}
        {prepForest.length === 0 && <p className={adminStyles.muted}>אין פריטים בתפריט האירוע.</p>}
      </div>

      {isOffsite && (
        <div className={styles.section}>
          <h2>ציוד לקחת לאירוע</h2>
          {equipmentRows.map((e) => {
            const key = `equipment:${e.equipId}`;
            return (
              <CheckRow
                key={e.equipId}
                eventId={id}
                itemKey={key}
                done={completed.has(key)}
                label={e.name}
                amount={`× ${e.qty}`}
              />
            );
          })}
          {equipmentRows.length === 0 && <p className={adminStyles.muted}>אין ציוד לקחת.</p>}
        </div>
      )}

      {isOffsite && (
        <div className={styles.section}>
          <h2>פריטים והכנות לקחת</h2>
          {bringItems.map((b) => {
            const key = `bring:${b.key}`;
            return (
              <CheckRow
                key={b.key}
                eventId={id}
                itemKey={key}
                done={completed.has(key)}
                label={b.label}
                qualifier={b.kind === "ingredient" ? "מרכיב גלם" : "הכנה"}
                amount={`${b.amount.toFixed(1)} ${b.unit}`}
              />
            );
          })}
          {bringItems.length === 0 && <p className={adminStyles.muted}>אין פריטים לקחת.</p>}
        </div>
      )}

      {isOwner && cost && (
        <div className={styles.section}>
          <h2>עלות חומרי גלם</h2>
          {cost.lines.map((line) => {
            const recipe = recipesById.get(line.recipeId);
            return (
              <p key={line.recipeId}>
                {recipe?.name ?? "—"} ({line.servings} {recipe?.baseUnit}): {formatCurrency(line.cost)}
              </p>
            );
          })}
          <p style={{ fontWeight: 700, marginTop: 8 }}>סה&quot;כ: {formatCurrency(cost.total)}</p>
          <p>ממוצע לסועד: {formatCurrency(event.guestCount > 0 ? cost.total / event.guestCount : 0)}</p>
          <p className={styles.disclaimer}>
            עלות חומרי גלם בלבד — לא כולל עבודה, ציוד, הובלה או רווח.
          </p>
        </div>
      )}
    </>
  );
}
