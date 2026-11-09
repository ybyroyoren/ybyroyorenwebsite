-- Owner-chosen order for products in the shop, for the sizes within a product,
-- and a per-product "default size" (the one preselected in the shop), which no
-- longer has to be the first one in the list.

alter table product_sizes add column if not exists is_default boolean not null default false;

-- Until now sort_order was 0 everywhere, so the order was whatever the
-- database returned. Number the existing rows (oldest first) so every product
-- and size gets a distinct position and the current order is kept.
update products p
set sort_order = r.rn
from (
  select id, row_number() over (order by sort_order, created_at) - 1 as rn
  from products
) r
where p.id = r.id;

update product_sizes s
set sort_order = r.rn
from (
  select id, row_number() over (partition by product_id order by sort_order, ctid) - 1 as rn
  from product_sizes
) r
where s.id = r.id;
