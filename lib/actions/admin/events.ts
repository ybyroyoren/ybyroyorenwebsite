"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function updateInquiryStatus(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner" && admin.role !== "sales") return;
  const db = supabaseAdmin();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const validStatuses = [
    "new",
    "contacted",
    "quoted",
    "approved_unpaid",
    "deposit_paid",
    "paid_closed",
    "closed",
  ];
  if (!id || !validStatuses.includes(status)) return;

  await db.from("event_inquiries").update({ status }).eq("id", id);
  revalidatePath("/admin/events");
}

export async function deleteInquiry(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;
  const db = supabaseAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.from("event_inquiries").delete().eq("id", id);
  revalidatePath("/admin/events");
}
