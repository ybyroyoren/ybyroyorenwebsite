-- Small shop settings edited by the owner (e.g. the minimum order amount). Not for secrets (see integration_settings).
create table site_settings (
  name text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table site_settings enable row level security;
