-- Bilingual product fields (English is optional — falls back to Hebrew
-- wherever it's empty, so existing products don't break).
alter table products add column name_en text;
alter table products add column description_en text;
alter table products add column allergens_en text;

-- Categories become an admin-managed table instead of a hardcoded list, so
-- the owner can add new ones without a code change. products.category keeps
-- storing the slug string (unchanged), now backed by a real FK.
create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  label_he text not null,
  label_en text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into categories (slug, label_he, label_en, sort_order) values
  ('desserts', 'קינוחים', 'Desserts', 0),
  ('spreads', 'ממרחים', 'Spreads', 1),
  ('frozen', 'קפואים', 'Frozen', 2),
  ('pasta', 'פסטה', 'Pasta', 3);

alter table products
  add constraint products_category_fkey foreign key (category) references categories(slug);
