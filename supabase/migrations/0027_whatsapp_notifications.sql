-- WhatsApp alerts (Meta Cloud API) next to the e-mail alerts: who gets which kind of alert, and a log of sends.
create table whatsapp_recipients (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  phone text not null unique,   -- international digits only, e.g. 972501234567
  notify_shop_order boolean not null default true,
  notify_event_inquiry boolean not null default true,
  notify_meal_registration boolean not null default true,
  notify_contact_message boolean not null default true,
  created_at timestamptz not null default now()
);
alter table whatsapp_recipients enable row level security;

create table notification_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  channel text not null,        -- 'whatsapp'
  type text not null,           -- shop_order / event_inquiry / meal_registration / contact_message / test
  recipient text not null,
  ok boolean not null,
  error text
);
alter table notification_log enable row level security;
create index notification_log_created_idx on notification_log (created_at desc);
