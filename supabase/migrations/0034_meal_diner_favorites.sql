-- What each open-meal diner especially loves to eat (free text, optional). Not a promise that it is on the menu.
alter table meal_diners
  add column favorite_foods text not null default '';
