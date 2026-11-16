-- Open-meal registrations: when the visitor confirmed the allergy warning and cancellation policy, and an optional
-- seating wish (e.g. "next to friends who booked separately").
alter table meal_registrations
  add column consented_at timestamptz,
  add column seating_note text not null default '';
