-- Per-meal control of how seats are shown on the public meals page: the text and the
-- meter are set independently. These only change what is displayed, never the real
-- seat counts, with one exception: text mode 'full' closes registration for the meal.

alter table meals
  add column seats_text_mode text not null default 'auto'
    check (seats_text_mode in ('auto', 'open', 'few', 'exact', 'full', 'custom', 'hidden')),
  add column seats_text_he text not null default '',
  add column seats_text_en text not null default '',
  add column seats_meter_mode text not null default 'auto'
    check (seats_meter_mode in ('auto', 'real', 'hidden'));
