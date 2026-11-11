-- ===== Kitchen: prices are entered once per invoice item =====
-- An invoice item is one thing bought from a supplier, priced exactly as on the
-- invoice (net, per purchase unit: kg, cob, sack...). Each kl_ingredients row is
-- one "form" of it (peeled, sliced...) with its own amount per purchase unit and
-- its own yield. kl_ingredients.price stays the per-unit price the cost engine reads;
-- it is now computed: price_net / units_per_purchase_unit. Nothing in the cost
-- formula changes, and existing ingredients keep exactly the price they have.

create table kl_invoice_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  supplier_id uuid references kl_suppliers(id) on delete set null,
  purchase_unit text not null default '',
  price_net numeric(16,8),
  vat_rate numeric(5,2) not null default 18 check (vat_rate >= 0 and vat_rate < 100),
  invoice_date date,
  invoice_no text not null default '',
  note text not null default '',
  price_updated_at timestamptz,
  created_at timestamptz not null default now(),
  legacy_ingredient_id uuid
);
create index kl_invoice_items_supplier_id_idx on kl_invoice_items(supplier_id);
alter table kl_invoice_items enable row level security;

alter table kl_ingredients
  add column invoice_item_id uuid references kl_invoice_items(id) on delete set null,
  add column units_per_purchase_unit numeric(16,5) not null default 1 check (units_per_purchase_unit > 0);
create index kl_ingredients_invoice_item_id_idx on kl_ingredients(invoice_item_id);

-- Room for prices that are small per gram (price / 1000 etc.) without rounding.
alter table kl_ingredients alter column price type numeric(16,8);

-- Every existing ingredient becomes one invoice item with one form, same price.
insert into kl_invoice_items (name, supplier_id, purchase_unit, price_net, legacy_ingredient_id)
select
  coalesce(nullif(trim(i.purchase_name), ''), i.name),
  i.supplier_id,
  coalesce(nullif(trim(i.purchase_unit), ''), i.unit),
  i.price,
  i.id
from kl_ingredients i
where i.invoice_item_id is null;

update kl_ingredients i
set invoice_item_id = it.id
from kl_invoice_items it
where it.legacy_ingredient_id = i.id and i.invoice_item_id is null;

alter table kl_invoice_items drop column legacy_ingredient_id;

-- ingredient.price (per measure unit) always follows its invoice item.
create or replace function kl_ingredient_apply_invoice_price() returns trigger
language plpgsql as $$
begin
  if new.invoice_item_id is not null then
    select
      case when it.price_net is null then null else it.price_net / new.units_per_purchase_unit end,
      it.supplier_id
    into new.price, new.supplier_id
    from kl_invoice_items it
    where it.id = new.invoice_item_id;
  end if;
  return new;
end $$;

create trigger kl_ingredient_apply_invoice_price_trg
before insert or update of invoice_item_id, units_per_purchase_unit on kl_ingredients
for each row execute function kl_ingredient_apply_invoice_price();

create or replace function kl_invoice_item_stamp() returns trigger
language plpgsql as $$
begin
  if new.price_net is distinct from old.price_net then
    new.price_updated_at := now();
  end if;
  return new;
end $$;

create trigger kl_invoice_item_stamp_trg
before update on kl_invoice_items
for each row execute function kl_invoice_item_stamp();

create or replace function kl_invoice_item_propagate() returns trigger
language plpgsql as $$
begin
  update kl_ingredients e
  set price = case when new.price_net is null then null else new.price_net / e.units_per_purchase_unit end,
      supplier_id = new.supplier_id
  where e.invoice_item_id = new.id;
  return null;
end $$;

create trigger kl_invoice_item_propagate_trg
after update of price_net, supplier_id on kl_invoice_items
for each row execute function kl_invoice_item_propagate();

-- ===== Events: cost frozen when the event is closed =====
alter table kl_events
  add column closed_at timestamptz,
  add column cost_snapshot jsonb;
