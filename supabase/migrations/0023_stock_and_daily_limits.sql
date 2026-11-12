-- Per-product limits for the shop.
--   * products.daily_limit: the most units of the product (all sizes together) that can be
--     picked up on one date. NULL = no limit.
--   * product_sizes.stock_qty: units left in stock "as of" stock_as_of. Orders placed after that
--     moment use it up; at 0 the size shows as sold out. NULL = no stock limit.

alter table products
  add column daily_limit int check (daily_limit is null or daily_limit > 0);

alter table product_sizes
  add column stock_qty int check (stock_qty is null or stock_qty >= 0),
  add column stock_as_of timestamptz;

-- Orders remember which size each line was, so limits and stock can be counted.
alter table order_items
  add column product_size_id uuid references product_sizes(id) on delete set null;
create index order_items_product_size_id_idx on order_items(product_size_id);

-- Orders entered by the owner always hold their units; website checkouts that were
-- started but not paid only hold them for 30 minutes.
alter table orders
  add column source text not null default 'web' check (source in ('web', 'admin'));

-- Units left per size (only for sizes that have a stock quantity). May go below 0 if oversold.
create or replace view product_size_stock as
select
  s.id as product_size_id,
  s.stock_qty - coalesce((
    select sum(oi.qty)
    from order_items oi
    join orders o on o.id = oi.order_id
    where oi.product_size_id = s.id
      and o.created_at >= coalesce(s.stock_as_of, '-infinity'::timestamptz)
      and (o.status = 'paid' or (o.status = 'pending' and (o.source = 'admin' or o.created_at > now() - interval '30 minutes')))
  ), 0)::int as remaining
from product_sizes s
where s.stock_qty is not null;

-- Units of each product already taken for each pickup date (all sizes together).
create or replace view product_day_usage as
select
  s.product_id,
  o.pickup_date,
  sum(oi.qty)::int as qty
from order_items oi
join orders o on o.id = oi.order_id
join product_sizes s on s.id = oi.product_size_id
where o.status = 'paid' or (o.status = 'pending' and (o.source = 'admin' or o.created_at > now() - interval '30 minutes'))
group by s.product_id, o.pickup_date;

alter view product_size_stock set (security_invoker = true);
alter view product_day_usage set (security_invoker = true);
