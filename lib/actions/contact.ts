"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { notifyNewContactMessage } from "@/lib/notifications";

export interface ContactState {
  status: "idle" | "success" | "error";
  message: string;
}

export async function submitContactForm(
  _prevState: ContactState,
  formData: FormData
): Promise<ContactState> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !phone || !email || !message) {
    return { status: "error", message: "נא למלא את כל השדות" };
  }

  const db = supabaseAdmin();
  const { error } = await db.from("contact_messages").insert({ name, phone, email, message });

  if (error) {
    return { status: "error", message: "משהו השתבש, נסו שוב" };
  }

  await notifyNewContactMessage({ name, phone, email, message });

  return { status: "success", message: "תודה! ההודעה נשלחה, נחזור אליכם בהקדם." };
}
