-- Y by Roy Oren — Phase 1 schema
--
-- Architecture note: all reads/writes go through the Next.js server using the
-- Supabase *service role* key (Server Components, Route Handlers, Server
-- Actions). The browser only talks to Supabase directly for anonymous auth
-- (to mint a durable cart session). Because of that, RLS is enabled on every
-- table with NO policies — the service role bypasses RLS entirely, and every
-- other role (anon/authenticated) is denied by default. This is intentional,
-- not an oversight: coupon codes, prices, and stock stay server-validated.

create extension if not exists pgcrypto;

-- ---------- products ----------
create table products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  category text not null,
  allergens text not null default '',
  image_urls text[] not null default '{}',
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table product_sizes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  label text not null,
  price_before_vat numeric(10,2) not null check (price_before_vat >= 0),
  stock_status text not null default 'in_stock' check (stock_status in ('in_stock', 'out_of_stock')),
  sort_order int not null default 0
);
create index product_sizes_product_id_idx on product_sizes(product_id);

-- ---------- coupons ----------
create table coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_pct numeric(4,3) not null check (discount_pct > 0 and discount_pct <= 1),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- cart (server-side session cart, keyed by anonymous auth user) ----------
create table carts (
  id uuid primary key default gen_random_uuid(),
  session_user_id uuid not null unique,
  created_at timestamptz not null default now()
);

create table cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references carts(id) on delete cascade,
  product_size_id uuid not null references product_sizes(id) on delete cascade,
  qty int not null check (qty > 0),
  unique (cart_id, product_size_id)
);

-- ---------- orders (shop checkout) ----------
create table orders (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid references carts(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  pickup_date date not null,
  notes text not null default '',
  coupon_id uuid references coupons(id) on delete set null,
  subtotal numeric(10,2) not null,
  vat numeric(10,2) not null,
  discount numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  grow_payment_id text,
  receipt_doc_id text,
  created_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_name text not null,
  size_label text not null default '',
  unit_price numeric(10,2) not null,
  qty int not null check (qty > 0)
);
create index order_items_order_id_idx on order_items(order_id);

-- ---------- open meals ----------
create table meals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  date date not null,
  total_seats int not null check (total_seats > 0),
  price_per_seat numeric(10,2) not null check (price_per_seat >= 0),
  menu jsonb not null default '[]',
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

create table meal_registrations (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references meals(id) on delete cascade,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  seats_count int not null check (seats_count > 0),
  deposit_total numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  grow_payment_id text,
  receipt_doc_id text,
  created_at timestamptz not null default now()
);
create index meal_registrations_meal_id_idx on meal_registrations(meal_id);

create table meal_diners (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references meal_registrations(id) on delete cascade,
  full_name text not null,
  dietary_restrictions text[] not null default '{}',
  notes text not null default ''
);
create index meal_diners_registration_id_idx on meal_diners(registration_id);

-- ---------- newsletter / contact ----------
create table newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null check (source in ('footer', 'events_form')),
  created_at timestamptz not null default now()
);

create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- ---------- admin ----------
-- Phase 1: single owner. Phase 2 adds kitchen/sales roles and RLS keyed off `role`.
create table admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'kitchen', 'sales')),
  created_at timestamptz not null default now()
);

-- ---------- derived seat availability (always the real count; display tiering happens in app code) ----------
create view meal_availability as
select
  m.id as meal_id,
  m.total_seats,
  coalesce(sum(r.seats_count) filter (where r.status = 'paid'), 0)::int as taken_seats,
  m.total_seats - coalesce(sum(r.seats_count) filter (where r.status = 'paid'), 0)::int as remaining_seats
from meals m
left join meal_registrations r on r.meal_id = m.id
group by m.id, m.total_seats;

-- ---------- RLS: enabled everywhere, no policies (service role only) ----------
alter table products enable row level security;
alter table product_sizes enable row level security;
alter table coupons enable row level security;
alter table carts enable row level security;
alter table cart_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table meals enable row level security;
alter table meal_registrations enable row level security;
alter table meal_diners enable row level security;
alter table newsletter_subscribers enable row level security;
alter table contact_messages enable row level security;
alter table admin_profiles enable row level security;
