import "server-only";
import type { KLEvent, KLGuest } from "./types";
import type {
  BringItem,
  EquipmentListRow,
  EventCostBreakdown,
  PrepTreeNode,
  ShoppingListGroup,
} from "./algorithms";
import { formatCurrency } from "@/lib/pricing";

function flattenPrepTree(node: PrepTreeNode, depth: number, lines: string[]): void {
  if (node.isReference) {
    lines.push(`${"  ".repeat(depth)}↳ ${node.recipe.name} — פורט למעלה (${node.totalAmount} ${node.recipe.baseUnit})`);
    return;
  }
  lines.push(`${"  ".repeat(depth)}• ${node.recipe.name} — ${node.totalAmount} ${node.recipe.baseUnit}`);
  node.recipe.prepSteps.forEach((step, i) => {
    lines.push(`${"  ".repeat(depth + 1)}${i + 1}. ${step.text}`);
  });
  for (const child of node.children) flattenPrepTree(child, depth + 1, lines);
}

export function buildSummaryText(
  event: KLEvent,
  guestsById: Map<string, KLGuest>,
  shoppingGroups: ShoppingListGroup[],
  prepForest: PrepTreeNode[],
  equipmentRows: EquipmentListRow[],
  bringItems: BringItem[],
  cost: EventCostBreakdown | null
): string {
  const sections: string[] = [];

  sections.push(
    [
      event.name,
      event.date ?? "",
      event.eventType === "offsite" ? "אירוע חוץ" : "אצלנו",
      event.location,
      `${event.guestCount} סועדים`,
    ]
      .filter(Boolean)
      .join(" · ")
  );

  if (event.notes) {
    sections.push(`הערות:\n${event.notes}`);
  }

  const assignedSeats = event.seats.filter((s) => s.guestId);
  if (assignedSeats.length > 0) {
    const lines = assignedSeats.map((s) => {
      const guest = s.guestId ? guestsById.get(s.guestId) : null;
      if (!guest) return "";
      return `${guest.name} | ${guest.phone || "—"} | ${guest.restrictions || "—"}`;
    });
    sections.push(`סועדים:\n${lines.join("\n")}`);
  }

  const shoppingLines = shoppingGroups.flatMap((g) => [
    `${g.supplierName}:`,
    ...g.rows.map((r) => `  ${r.displayName} — ${r.purchaseAmount.toFixed(1)} ${r.displayUnit}`),
  ]);
  sections.push(`רשימת קניות:\n${shoppingLines.join("\n")}`);

  const prepLines: string[] = [];
  for (const node of prepForest) flattenPrepTree(node, 0, prepLines);
  sections.push(`רשימת הכנות:\n${prepLines.join("\n")}`);

  if (event.eventType === "offsite") {
    if (equipmentRows.length > 0) {
      sections.push(`ציוד לקחת:\n${equipmentRows.map((e) => `${e.name} × ${e.qty}`).join("\n")}`);
    }
    if (bringItems.length > 0) {
      sections.push(`פריטים והכנות לקחת:\n${bringItems.map((b) => `${b.label} — ${b.amount.toFixed(1)} ${b.unit}`).join("\n")}`);
    }
  }

  if (cost) {
    const lines = cost.lines.map((l) => `מנה: ${formatCurrency(l.cost)}`);
    sections.push(
      `עלות חומרי גלם (בלבד, לא כולל עבודה/ציוד/הובלה):\n${lines.join("\n")}\nסה"כ: ${formatCurrency(cost.total)}\nממוצע לסועד: ${formatCurrency(event.guestCount > 0 ? cost.total / event.guestCount : 0)}`
    );
  }

  return sections.join("\n\n===\n\n");
}
