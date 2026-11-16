-- Coupon codes for open-meal deposits. A coupon says where it works (shop, open meals, or both); existing coupons
-- stay shop-only. A registration remembers the coupon used and how much it took off the deposit.
alter table coupons
  add column applies_to text not null default 'shop' check (applies_to in ('shop', 'meals', 'both'));

alter table meal_registrations
  add column coupon_id uuid references coupons(id) on delete set null,
  add column deposit_discount numeric(10,2) not null default 0;
