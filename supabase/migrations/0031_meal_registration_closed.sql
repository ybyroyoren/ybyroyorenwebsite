-- Owner can close registration for a meal by hand (shown as "full") even when seats are left, e.g. to host only
-- 16 diners of 20. Separate from the seats text setting, so reopening restores the text the meal had.
alter table meals add column registration_closed boolean not null default false;

-- Meals that were closed through the old "full" text option move to the new switch.
update meals set registration_closed = true, seats_text_mode = 'auto' where seats_text_mode = 'full';
