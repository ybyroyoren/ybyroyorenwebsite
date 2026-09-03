-- How a paid order was actually paid — null until marked paid (or for older
-- rows, "website" backfilled below since that's the only channel that
-- existed before this migration).
alter table orders add column payment_method text
  check (payment_method is null or payment_method in ('website', 'credit_card', 'bit', 'paybox', 'cash', 'bank_transfer'));

update orders set payment_method = 'website' where status = 'paid';

-- orders.cart_id is already nullable (on delete set null, no not-null), so
-- admin-entered phone/in-person orders can leave it null with no schema change.

-- Add "awaiting_payment" as a selectable prep status (distinct from the
-- payment `status` column, which still gates webhook/receipt logic).
alter table orders drop constraint orders_fulfillment_status_check;
alter table orders add constraint orders_fulfillment_status_check check (
  fulfillment_status in ('awaiting_payment', 'open', 'prepared', 'completed', 'partially_fulfilled', 'no_show')
);
