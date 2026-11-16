// One line for the kitchen: how many diners have each dietary profile. A diner with several restrictions counts once,
// as one combined entry ("ללא בשר + כן דגים ×1"), so the numbers always add up to the number of diners.

interface SummaryDiner {
  restrictions: string[];
  notes: string;
}

interface SummaryRegistration {
  status: string;
  diners: SummaryDiner[];
}

const NONE = "ללא הגבלות";

/** "אחר" is shown with what the diner wrote, e.g. "אחר: לא אוהב בצל". Order is the order the diner chose them in. */
function labelsOf(diner: SummaryDiner): string[] {
  return diner.restrictions.map((label) => {
    if (!label.startsWith("אחר")) return label;
    const note = diner.notes.trim();
    return note ? `אחר: ${note}` : "אחר";
  });
}

/** E.g. "הגבלות תזונה (10 סועדים): צמחוני ×1 · ללא בשר + כן דגים ×1 · ללא הגבלות ×7". Null when nobody has registered. */
export function restrictionSummary(registrations: SummaryRegistration[]): string | null {
  // Diners with the same restrictions are one group whatever order they picked them in; the group is shown in the
  // order its first diner picked them, so it reads the way the customer wrote it.
  const groups = new Map<string, { shown: string; count: number }>();
  let total = 0;
  for (const registration of registrations) {
    if (registration.status === "cancelled") continue;
    for (const diner of registration.diners) {
      total++;
      const labels = labelsOf(diner);
      const shown = labels.length > 0 ? labels.join(" + ") : NONE;
      const key = labels.length > 0 ? [...labels].sort().join("\u0000") : NONE;
      const group = groups.get(key);
      if (group) group.count++;
      else groups.set(key, { shown, count: 1 });
    }
  }
  if (total === 0) return null;

  const none = groups.get(NONE)?.count ?? 0;
  groups.delete(NONE);
  const parts = [...groups.values()].sort((a, b) => b.count - a.count).map((g) => `${g.shown} ×${g.count}`);
  if (none > 0) parts.push(`${NONE} ×${none}`);
  return `הגבלות תזונה (${total} סועדים): ${parts.join(" · ")}`;
}
