-- 1) Coupons can be a fixed amount (shekels) and not only a percentage; for open meals they can take the amount off the
--    deposit or off the balance beyond the deposit (paid at the table).
alter table coupons
  add column kind text not null default 'percent' check (kind in ('percent', 'amount')),
  add column discount_amount numeric(10,2) check (discount_amount is null or discount_amount > 0),
  add column meal_target text not null default 'deposit' check (meal_target in ('deposit', 'balance'));

alter table coupons alter column discount_pct drop not null;
alter table coupons drop constraint if exists coupons_discount_pct_check;
alter table coupons add constraint coupons_discount_pct_check check (discount_pct is null or (discount_pct > 0 and discount_pct <= 1));
alter table coupons add constraint coupons_value_matches_kind check (
  (kind = 'percent' and discount_pct is not null) or (kind = 'amount' and discount_amount is not null)
);

-- 2) Open-meal payments are tracked as amounts: how much was paid so far, and the discounts (deposit / balance).
alter table meal_registrations
  add column paid_amount numeric(10,2) not null default 0,
  add column balance_discount numeric(10,2) not null default 0;

-- Existing registrations: paid so far = the deposit when paid on the site, otherwise 100 per diner marked as paid.
update meal_registrations r
set paid_amount = case
  when r.status = 'paid' then r.deposit_total
  else 100 * (select count(*) from meal_diners d where d.registration_id = r.id and d.deposit_paid)
end;
