-- Event dossier: every private event (kl_events) becomes a full "event file".
-- Existing events keep working; they are treated as already-closed deals.
-- deal_status is the sales state ("open" = still negotiating, "closed" = confirmed).
-- It is NOT the same thing as closed_at, which freezes the raw-material cost.

alter table kl_events
  add column deal_status text not null default 'closed' check (deal_status in ('open', 'closed')),
  add column gather_time text not null default '',
  add column start_time text not null default '',
  add column end_time text not null default '',
  add column category text not null default '',
  add column category_other text not null default '',
  add column service_style text not null default '',
  add column kids_count int not null default 0 check (kids_count >= 0),
  add column portions_count int check (portions_count is null or portions_count >= 0),
  -- venue
  add column venue_name text not null default '',
  add column venue_access text not null default '',
  add column venue_notes text not null default '',
  add column kitchen_has text[] not null default '{}',
  add column kitchen_notes text not null default '',
  -- contacts
  add column client_name text not null default '',
  add column client_phone text not null default '',
  add column client_email text not null default '',
  add column site_contact_name text not null default '',
  add column site_contact_phone text not null default '',
  -- dietary
  add column general_restriction_tags text[] not null default '{}',
  add column general_restrictions text not null default '',
  add column diner_restrictions jsonb not null default '[]',
  -- equipment
  add column special_equipment text not null default '',
  add column rental_needed boolean not null default false,
  add column rental_notes text not null default '',
  add column bring_serving_ware boolean not null default false,
  add column serving_ware_notes text not null default '',
  -- menu tracking
  add column menu_built boolean not null default false,
  add column menu_sent boolean not null default false,
  add column menu_approved boolean not null default false,
  add column menu_notes text not null default '',
  -- price
  add column price_per_diner numeric(10,2) check (price_per_diner is null or price_per_diner >= 0),
  add column price_extras jsonb not null default '[]',
  add column discount numeric(10,2) not null default 0 check (discount >= 0),
  add column discount_note text not null default '',
  add column quote_sent boolean not null default false,
  add column contract_signed boolean not null default false,
  add column deposit_amount numeric(10,2) check (deposit_amount is null or deposit_amount >= 0),
  add column deposit_paid boolean not null default false,
  add column fully_paid boolean not null default false,
  -- staff
  add column need_managers int not null default 0 check (need_managers >= 0),
  add column need_cooks int not null default 0 check (need_cooks >= 0),
  add column need_waiters int not null default 0 check (need_waiters >= 0),
  add column staff jsonb not null default '[]',
  -- drinks
  add column drinks_by_us boolean not null default false,
  add column drinks_notes text not null default '',
  add column alcohol boolean not null default false,
  add column alcohol_notes text not null default '',
  add column ice boolean not null default false,
  add column ice_notes text not null default '',
  -- to-do list and the website inquiry this file came from
  add column tasks jsonb not null default '[]',
  add column inquiry_id uuid references event_inquiries(id) on delete set null;

create index kl_events_date_idx on kl_events(date);
create index kl_events_inquiry_id_idx on kl_events(inquiry_id);
