-- Connection details for outside services (SMS4Free), entered on the notifications admin screen instead of in Vercel.
-- Only the server (service role) can read this table; the admin screen never shows the secret values back.
create table integration_settings (
  name text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table integration_settings enable row level security;
