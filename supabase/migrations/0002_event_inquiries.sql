-- Phase 2: private events inquiry form (spec §6).
-- Same architecture as 0001_init.sql — RLS enabled, no policies, server-role only.

create table event_inquiries (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  full_name text not null,
  phone text not null,
  email text not null,
  event_date date,
  start_time text,
  location_type text not null check (location_type in ('venue', 'other')),
  location_detail text not null default '',
  format text not null check (format in ('buffet', 'seated', 'other')),
  service_style text check (service_style in ('plated', 'family')),
  guest_count int not null check (guest_count >= 10),
  details text not null default '',
  newsletter_opt_in boolean not null default false,
  status text not null default 'new' check (status in ('new', 'contacted', 'quoted', 'closed')),
  created_at timestamptz not null default now()
);

alter table event_inquiries enable row level security;
