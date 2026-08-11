-- "Kitchen Ledger" — internal back-office system for recipe costing, prep
-- planning, and event production (distinct from the customer-facing shop
-- orders / meal registrations / event inquiries elsewhere in this schema).
-- All tables prefixed kl_ to avoid any naming collision with those.
--
-- Same architecture as the rest of the project: RLS enabled, no policies —
-- every read/write goes through the Next.js server via the service role.

create table kl_suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table kl_equipment (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table kl_guests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null default '',
  restrictions text not null default '',
  created_at timestamptz not null default now()
);

create table kl_ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text not null,
  supplier_id uuid references kl_suppliers(id) on delete set null,
  purchase_name text not null default '',
  purchase_unit text not null default '',
  yield_percent numeric(5,2) check (yield_percent is null or (yield_percent > 0 and yield_percent <= 100)),
  price numeric(12,5),
  created_at timestamptz not null default now()
);
create index kl_ingredients_supplier_id_idx on kl_ingredients(supplier_id);

create table kl_recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('dish', 'prep')),
  base_amount numeric(12,3) not null check (base_amount > 0),
  base_unit text not null,
  prep_steps jsonb not null default '[]',       -- [{ id, text }]
  prep_equipment jsonb not null default '[]',    -- [{ equipId, qty }] — home prep only, not taken to events
  event_equipment jsonb not null default '[]',   -- [{ equipId, qty }] — taken to events
  created_at timestamptz not null default now()
);

-- Many-to-many self-referential component list. A recipe's ingredients and
-- nested-recipe children live here (kind discriminates which FK is set).
create table kl_recipe_components (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references kl_recipes(id) on delete cascade,
  kind text not null check (kind in ('ingredient', 'recipe')),
  ingredient_id uuid references kl_ingredients(id) on delete cascade,
  component_recipe_id uuid references kl_recipes(id) on delete cascade,
  amount numeric(12,3) not null check (amount > 0),
  sort_order int not null default 0,
  check (
    (kind = 'ingredient' and ingredient_id is not null and component_recipe_id is null) or
    (kind = 'recipe' and component_recipe_id is not null and ingredient_id is null)
  )
);
create index kl_recipe_components_recipe_id_idx on kl_recipe_components(recipe_id);
create index kl_recipe_components_component_recipe_id_idx on kl_recipe_components(component_recipe_id);

create table kl_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date date,
  event_type text not null check (event_type in ('onsite', 'offsite')),
  location text not null default '',
  guest_count int not null default 0 check (guest_count >= 0),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table kl_event_menu (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references kl_events(id) on delete cascade,
  recipe_id uuid not null references kl_recipes(id) on delete cascade,
  servings numeric(12,3) not null check (servings > 0),
  sort_order int not null default 0
);
create index kl_event_menu_event_id_idx on kl_event_menu(event_id);

-- One row per seat (0-indexed up to guest_count - 1). guest_id null = unassigned.
create table kl_event_guest_seats (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references kl_events(id) on delete cascade,
  seat_index int not null,
  guest_id uuid references kl_guests(id) on delete set null,
  unique (event_id, seat_index)
);

-- Checkbox state for an event's prep tree / shopping list, persisted so the
-- whole team sees the same state (refresh-to-sync, per the v1 scope).
create table kl_event_completed_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references kl_events(id) on delete cascade,
  item_key text not null,   -- e.g. "recipe:<id>", "step:<recipeId>:<stepId>", "shopping:<ingredientId>"
  created_at timestamptz not null default now(),
  unique (event_id, item_key)
);

alter table kl_suppliers enable row level security;
alter table kl_equipment enable row level security;
alter table kl_guests enable row level security;
alter table kl_ingredients enable row level security;
alter table kl_recipes enable row level security;
alter table kl_recipe_components enable row level security;
alter table kl_events enable row level security;
alter table kl_event_menu enable row level security;
alter table kl_event_guest_seats enable row level security;
alter table kl_event_completed_items enable row level security;
