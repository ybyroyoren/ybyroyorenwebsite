-- Allergens become an owner-managed list of colored tags instead of free text:
-- the owner builds the list once, picks tags per product, and the shop can
-- filter by them. The old free-text products.allergens / allergens_en columns
-- stay in place (no longer used) so nothing is lost.

create table allergens (
  id uuid primary key default gen_random_uuid(),
  label_he text not null,
  label_en text not null default '',
  color text not null default '#c9923a',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table product_allergens (
  product_id uuid not null references products(id) on delete cascade,
  allergen_id uuid not null references allergens(id) on delete cascade,
  primary key (product_id, allergen_id)
);

alter table allergens enable row level security;
alter table product_allergens enable row level security;

-- Starter list (the owner can edit, recolor, delete or add more).
insert into allergens (label_he, label_en, color, sort_order) values
  ('גלוטן', 'Gluten', '#c9923a', 0),
  ('ביצים', 'Eggs', '#d9ae2f', 1),
  ('חלב', 'Milk', '#4f86c6', 2),
  ('לקטוז', 'Lactose', '#7aa7d9', 3),
  ('אגוזים', 'Nuts', '#8b5a3c', 4),
  ('בוטנים', 'Peanuts', '#b0703c', 5),
  ('סויה', 'Soy', '#6f9a4d', 6),
  ('שומשום', 'Sesame', '#a89463', 7),
  ('פרג', 'Poppy seeds', '#6b4f8a', 8),
  ('קוקוס', 'Coconut', '#3f8f8b', 9);

-- Tag existing products from their old free-text allergen list.
insert into product_allergens (product_id, allergen_id)
select p.id, a.id
from products p
join allergens a on position(a.label_he in p.allergens) > 0
on conflict do nothing;
