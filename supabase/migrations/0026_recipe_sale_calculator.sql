-- Per-recipe "sold in the shop" pricing calculator. Kept on the recipe screen only (not read by the shop).
-- sale_variants: [{ id, grams, extras: [{ id, name, cost }], mode, salePrice, foodCostPct }]
alter table kl_recipes add column sold_in_store boolean not null default false;
alter table kl_recipes add column sale_variants jsonb not null default '[]';
