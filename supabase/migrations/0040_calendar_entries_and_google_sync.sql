-- Calendar entries added by hand (meetings, notes, blocked dates) and the bookkeeping for the Google Calendar sync.
-- Same architecture as the rest: RLS enabled, no policies, server-role only.

create table calendar_entries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('meeting', 'note', 'blocked')),
  title text not null,
  details text not null default '',
  location text not null default '',
  start_date date not null,
  end_date date not null,
  start_time text not null default '',
  end_time text not null default '',
  -- where the entry was created: on the site, or directly in Google Calendar
  source text not null default 'site' check (source in ('site', 'google')),
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index calendar_entries_start_date_idx on calendar_entries(start_date);
alter table calendar_entries enable row level security;

-- One row per site item that has a copy in Google Calendar.
create table calendar_sync_links (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('event', 'meal', 'entry')),
  entity_id uuid not null,
  google_event_id text not null unique,
  -- fingerprint of what was last sent, so unchanged items are skipped
  content_hash text not null default '',
  -- Google's own "updated" stamp right after our last write, to tell our echo from an outside edit
  google_updated text not null default '',
  created_at timestamptz not null default now(),
  unique (entity_type, entity_id)
);
alter table calendar_sync_links enable row level security;
