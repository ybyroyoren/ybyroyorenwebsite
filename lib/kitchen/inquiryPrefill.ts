import type { EventPrefill } from "@/components/admin/kitchen/EventEditorForm";

const TYPE_LABEL: Record<string, string> = {
  family: "ערב משפחתי",
  corporate: "אירוע חברה",
  wedding: "חתונה",
  birthday: "יום הולדת",
  holiday: "ארוחת חג",
  bachelor: "מסיבת רווקים/ות",
  barmitzvah: "בר מצווה",
  other: "אחר",
};

const CATEGORY: Record<string, string> = {
  family: "family",
  holiday: "family",
  corporate: "company",
  wedding: "wedding",
  birthday: "birthday",
  bachelor: "friends",
  barmitzvah: "family",
  other: "other",
};

interface InquiryRow {
  id: string;
  event_type: string;
  full_name: string;
  phone: string;
  email: string;
  event_date: string | null;
  start_time: string | null;
  location_type: string;
  location_detail: string | null;
  format: string;
  service_style: string | null;
  guest_count: number;
  details: string | null;
}

/** A website inquiry, turned into the starting values of a new event file. */
export function prefillFromInquiry(inq: InquiryRow): EventPrefill {
  const serviceStyle =
    inq.format === "buffet" ? "buffet" : inq.service_style === "plated" ? "plated" : inq.service_style === "family" ? "family" : "";
  const time = /^\d{2}:\d{2}/.test(inq.start_time ?? "") ? (inq.start_time as string).slice(0, 5) : "";
  return {
    name: `${TYPE_LABEL[inq.event_type] ?? "אירוע"} — ${inq.full_name}`,
    date: inq.event_date ?? "",
    eventType: inq.location_type === "venue" ? "onsite" : "offsite",
    location: inq.location_detail ?? "",
    guestCount: inq.guest_count,
    notes: inq.details ?? "",
    dossier: {
      dealStatus: "open",
      category: CATEGORY[inq.event_type] ?? "",
      serviceStyle,
      startTime: time,
      clientName: inq.full_name,
      clientPhone: inq.phone,
      clientEmail: inq.email,
      inquiryId: inq.id,
    },
  };
}
