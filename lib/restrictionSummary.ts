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

/** "אחר" is shown with what the diner wrote, e.g. "אחר: לא אוהב בצל". */
function profileOf(diner: SummaryDiner): string {
  const labels = diner.restrictions
    .map((label) => {
      if (!label.startsWith("אחר")) return label;
      const note = diner.notes.trim();
      return note ? `אחר: ${note}` : "אחר";
    })
    .sort((a, b) => a.localeCompare(b, "he"));
  return labels.length > 0 ? labels.join(" + ") : NONE;
}

/** E.g. "הגבלות תזונה (10 סועדים): צמחוני ×1 · ללא בשר + כן דגים ×1 · ללא הגבלות ×7". Null when nobody has registered. */
export function restrictionSummary(registrations: SummaryRegistration[]): string | null {
  const counts = new Map<string, number>();
  let total = 0;
  for (const registration of registrations) {
    if (registration.status === "cancelled") continue;
    for (const diner of registration.diners) {
      total++;
      const profile = profileOf(diner);
      counts.set(profile, (counts.get(profile) ?? 0) + 1);
    }
  }
  if (total === 0) return null;

  const none = counts.get(NONE) ?? 0;
  counts.delete(NONE);
  const parts = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([profile, n]) => `${profile} ×${n}`);
  if (none > 0) parts.push(`${NONE} ×${none}`);
  return `הגבלות תזונה (${total} סועדים): ${parts.join(" · ")}`;
}
