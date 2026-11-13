-- Total weight (in grams) a recipe yields, next to its base amount / base unit
-- (e.g. 10 servings that come to 1500 g). Used for the cost per gram.
alter table kl_recipes
  add column total_grams numeric(12,3) check (total_grams is null or total_grams > 0);
