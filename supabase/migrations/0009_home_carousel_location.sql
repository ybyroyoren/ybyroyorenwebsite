-- The site_media.location CHECK constraint predates the home page carousel
-- feature, so every upload with location='home_carousel' was silently
-- rejected by Postgres (the app never surfaced the DB error to the admin).
alter table site_media drop constraint site_media_location_check;
alter table site_media add constraint site_media_location_check
  check (location in ('meals_carousel', 'events_carousel', 'about_hero', 'home_carousel'));
