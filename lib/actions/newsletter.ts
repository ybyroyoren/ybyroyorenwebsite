"use server";

import { supabaseAdmin } from "@/lib/supabase/server";

export interface NewsletterState {
  status: "idle" | "success" | "error";
  message: string;
}

export async function subscribeToNewsletter(
  _prevState: NewsletterState,
  formData: FormData
): Promise<NewsletterState> {
  const email = String(formData.get("email") ?? "").trim();
  const source = formData.get("source") === "events_form" ? "events_form" : "footer";

  if (!email || !email.includes("@")) {
    return { status: "error", message: "כתובת אימייל לא תקינה" };
  }

  const db = supabaseAdmin();
  const { error } = await db
    .from("newsletter_subscribers")
    .upsert({ email, source }, { onConflict: "email" });

  if (error) {
    return { status: "error", message: "משהו השתבש, נסו שוב" };
  }

  return { status: "success", message: "תודה! נרשמתם בהצלחה." };
}
