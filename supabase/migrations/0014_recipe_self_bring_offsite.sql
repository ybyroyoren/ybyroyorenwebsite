-- Whether the dish/prep ITSELF goes on an offsite event's "items and preps to
-- bring" list when it is on the event's menu. (Its components have their own
-- flags, kl_recipe_components.bring_offsite, so e.g. the finished dish can stay
-- home while some ingredients still travel.)
-- Defaults to true: menu dishes already appear on that list today.
alter table kl_recipes add column bring_offsite boolean not null default true;
