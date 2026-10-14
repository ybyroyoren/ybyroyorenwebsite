-- Per-component "taken to offsite events" flag, plus free-text bring items per
-- recipe. Both feed the "items and preps to bring" list of an offsite event.
--
-- bring_offsite defaults to true on purpose: until now every direct child of
-- a dish (raw ingredient or prep) was brought to offsite events, so existing
-- recipes keep producing the same list until someone unticks an item.
alter table kl_recipe_components add column bring_offsite boolean not null default true;

-- [{ id, text }] — free-form extras to take (e.g. "disposable cutlery"),
-- not tied to any ingredient.
alter table kl_recipes add column bring_items jsonb not null default '[]';
