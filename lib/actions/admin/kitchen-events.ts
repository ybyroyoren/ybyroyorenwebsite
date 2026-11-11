"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getEventById, getKitchenGraph } from "@/lib/kitchen/data";
import { eventCostBreakdown, recipeHasMissingPrices } from "@/lib/kitchen/algorithms";
import type { KLEventCostSnapshot } from "@/lib/kitchen/types";

/**
 * Closing an event freezes its raw-material cost: the cost at today's prices is
 * stored on the event, so later price changes don't alter events that already
 * took place. Open events keep following current prices.
 */
export async function closeKitchenEvent(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const [event, graph] = await Promise.all([getEventById(id), getKitchenGraph()]);
  if (!event) return;
  const { recipesById, ingredientsById } = graph;

  const cost = eventCostBreakdown(event.menu, recipesById, ingredientsById);
  const snapshot: KLEventCostSnapshot = {
    takenAt: new Date().toISOString(),
    total: cost.total,
    partial: event.menu.some((m) => recipeHasMissingPrices(m.recipeId, recipesById, ingredientsById)),
    lines: cost.lines.map((l) => ({
      recipeId: l.recipeId,
      recipeName: recipesById.get(l.recipeId)?.name ?? "—",
      servings: l.servings,
      unit: recipesById.get(l.recipeId)?.baseUnit ?? "",
      cost: l.cost,
    })),
  };

  await supabaseAdmin().from("kl_events").update({ closed_at: snapshot.takenAt, cost_snapshot: snapshot }).eq("id", id);
  revalidatePath("/admin/kitchen/events");
  revalidatePath(`/admin/kitchen/events/${id}/summary`);
}

/** Back to a live cost (the frozen one is discarded). */
export async function reopenKitchenEvent(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabaseAdmin().from("kl_events").update({ closed_at: null, cost_snapshot: null }).eq("id", id);
  revalidatePath("/admin/kitchen/events");
  revalidatePath(`/admin/kitchen/events/${id}/summary`);
}
