import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendContactNotificationEmail } from "@/lib/resend";

export interface EventInquiryInput {
  eventType: string;
  fullName: string;
  phone: string;
  email: string;
  eventDate: string;
  startTime: string;
  locationType: "venue" | "other";
  locationDetail: string;
  format: "buffet" | "seated" | "other";
  serviceStyle: "plated" | "family" | "";
  guestCount: number;
  details: string;
  newsletterOptIn: boolean;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  family: "ערב משפחתי",
  corporate: "אירוע חברה",
  wedding: "חתונה",
  birthday: "יום הולדת",
  holiday: "ארוחת חג",
  bachelor: "מסיבת רווקים/ות",
  barmitzvah: "בר מצווה",
  other: "אחר",
};

export async function createEventInquiry(input: EventInquiryInput): Promise<{ id: string }> {
  if (!input.eventType || !input.fullName.trim() || !input.phone.trim() || !input.email.trim()) {
    throw new Error("נא למלא את כל השדות הנדרשים");
  }
  if (!input.locationType || !input.format) {
    throw new Error("נא לבחור מיקום וסגנון הגשה");
  }
  if (!(input.guestCount >= 10)) {
    throw new Error("מינימום 10 סועדים לאירוע");
  }

  const db = supabaseAdmin();

  const { data, error } = await db
    .from("event_inquiries")
    .insert({
      event_type: input.eventType,
      full_name: input.fullName,
      phone: input.phone,
      email: input.email,
      event_date: input.eventDate || null,
      start_time: input.startTime || null,
      location_type: input.locationType,
      location_detail: input.locationDetail,
      format: input.format,
      service_style: input.serviceStyle || null,
      guest_count: input.guestCount,
      details: input.details,
      newsletter_opt_in: input.newsletterOptIn,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create inquiry");

  if (input.newsletterOptIn) {
    await db
      .from("newsletter_subscribers")
      .upsert({ email: input.email, source: "events_form" }, { onConflict: "email" });
  }

  await sendContactNotificationEmail({
    name: input.fullName,
    phone: input.phone,
    email: input.email,
    message:
      `פנייה חדשה לאירוע פרטי — ${EVENT_TYPE_LABELS[input.eventType] ?? input.eventType}\n` +
      `תאריך: ${input.eventDate || "לא צוין"} ${input.startTime ? `בשעה ${input.startTime}` : ""}\n` +
      `מיקום: ${input.locationType === "venue" ? "אצלנו" : `בלוקיישן אחר — ${input.locationDetail}`}\n` +
      `סגנון: ${input.format}${input.serviceStyle ? ` (${input.serviceStyle})` : ""}\n` +
      `מספר אורחים משוער: ${input.guestCount}\n` +
      `פרטים: ${input.details || "—"}`,
  });

  return { id: data.id };
}
