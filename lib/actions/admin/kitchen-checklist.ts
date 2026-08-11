"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Anyone with admin access (owner/kitchen/sales) can check off prep items. */
export async function toggleCompletedItem(formData: FormData): Promise<void> {
  await requireAdmin();

  const eventId = String(formData.get("eventId") ?? "");
  const itemKey = String(formData.get("itemKey") ?? "");
  const currentlyDone = formData.get("done") === "1";
  if (!eventId || !itemKey) return;

  const db = supabaseAdmin();
  if (currentlyDone) {
    await db.from("kl_event_completed_items").delete().eq("event_id", eventId).eq("item_key", itemKey);
  } else {
    await db.from("kl_event_completed_items").insert({ event_id: eventId, item_key: itemKey });
  }

  revalidatePath(`/admin/kitchen/events/${eventId}/summary`);
}
