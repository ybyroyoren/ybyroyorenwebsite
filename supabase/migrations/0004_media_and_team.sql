-- Public storage bucket for product photos, page carousels, and the About
-- hero image. Public bucket = publicly readable object URLs without an RLS
-- policy; uploads/deletes still only ever happen via the service role from
-- the Next.js server, consistent with every other table in this project.
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

-- Generic gallery/hero images not tied to a specific product or meal —
-- used for the meals-page carousel, the events-page carousel, and the
-- About-page hero photo.
create table site_media (
  id uuid primary key default gen_random_uuid(),
  location text not null check (location in ('meals_carousel', 'events_carousel', 'about_hero')),
  image_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table site_media enable row level security;
