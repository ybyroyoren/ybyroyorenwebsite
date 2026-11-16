-- People shown in the "team" section of the About page: photo, name, role and a short paragraph, in order.
create table team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_en text not null default '',
  role text not null default '',
  role_en text not null default '',
  bio text not null default '',
  bio_en text not null default '',
  image_url text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table team_members enable row level security;
