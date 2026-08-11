import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { KLEventType } from "./types";

export interface EventMenuLineInput {
  recipeId: string;
  servings: number;
}

export interface EventSeatInput {
  seatIndex: number;
  guestId: string | null;
  newGuest?: { name: string; phone: string; restrictions: string };
}

export interface EventInput {
  name: string;
  date: string | null;
  eventType: KLEventType;
  location: string;
  guestCount: number;
  notes: string;
  menu: EventMenuLineInput[];
  seats: EventSeatInput[];
}

function validate(input: EventInput): string | null {
  if (!input.name.trim()) return "שם האירוע חסר";
  if (!(input.guestCount >= 0)) return "מספר סועדים לא תקין";
  for (const m of input.menu) {
    if (!(m.servings > 0)) return "מספר מנות בתפריט חייב להיות גדול מ-0";
  }
  return null;
}

async function replaceMenu(eventId: string, menu: EventMenuLineInput[]): Promise<void> {
  const db = supabaseAdmin();
  await db.from("kl_event_menu").delete().eq("event_id", eventId);
  if (menu.length === 0) return;
  const rows = menu.map((m, i) => ({ event_id: eventId, recipe_id: m.recipeId, servings: m.servings, sort_order: i }));
  const { error } = await db.from("kl_event_menu").insert(rows);
  if (error) throw new Error(error.message);
}

async function replaceSeats(eventId: string, guestCount: number, seats: EventSeatInput[]): Promise<void> {
  const db = supabaseAdmin();

  // Resolve inline-created guests to real ids first.
  const resolved = new Map<number, string | null>();
  for (const seat of seats) {
    if (seat.guestId) {
      resolved.set(seat.seatIndex, seat.guestId);
    } else if (seat.newGuest && seat.newGuest.name.trim()) {
      const { data, error } = await db
        .from("kl_guests")
        .insert({
          name: seat.newGuest.name.trim(),
          phone: seat.newGuest.phone.trim(),
          restrictions: seat.newGuest.restrictions.trim(),
        })
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message ?? "יצירת סועד נכשלה");
      resolved.set(seat.seatIndex, data.id);
    } else {
      resolved.set(seat.seatIndex, null);
    }
  }

  await db.from("kl_event_guest_seats").delete().eq("event_id", eventId);
  const rows = Array.from({ length: guestCount }, (_, i) => ({
    event_id: eventId,
    seat_index: i,
    guest_id: resolved.get(i) ?? null,
  }));
  if (rows.length > 0) {
    const { error } = await db.from("kl_event_guest_seats").insert(rows);
    if (error) throw new Error(error.message);
  }
}

export async function createEvent(input: EventInput): Promise<{ id: string } | { error: string }> {
  const validationError = validate(input);
  if (validationError) return { error: validationError };

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("kl_events")
    .insert({
      name: input.name.trim(),
      date: input.date || null,
      event_type: input.eventType,
      location: input.location.trim(),
      guest_count: input.guestCount,
      notes: input.notes.trim(),
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "יצירת האירוע נכשלה" };

  await replaceMenu(data.id, input.menu);
  await replaceSeats(data.id, input.guestCount, input.seats);
  return { id: data.id };
}

export async function updateEvent(eventId: string, input: EventInput): Promise<{ ok: true } | { error: string }> {
  const validationError = validate(input);
  if (validationError) return { error: validationError };

  const db = supabaseAdmin();
  const { error } = await db
    .from("kl_events")
    .update({
      name: input.name.trim(),
      date: input.date || null,
      event_type: input.eventType,
      location: input.location.trim(),
      guest_count: input.guestCount,
      notes: input.notes.trim(),
    })
    .eq("id", eventId);
  if (error) return { error: error.message };

  await replaceMenu(eventId, input.menu);
  await replaceSeats(eventId, input.guestCount, input.seats);
  return { ok: true };
}

export async function deleteEvent(eventId: string): Promise<void> {
  const db = supabaseAdmin();
  await db.from("kl_events").delete().eq("id", eventId);
}
