-- A recipe's base amount is now derived from grams / portions (e.g. 1000 g in 150 g portions = 6.666667
-- portions), so it needs more decimals than 3.
alter table kl_recipes
  alter column base_amount type numeric(14,6);
