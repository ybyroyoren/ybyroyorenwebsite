-- More details per open-meal diner (first / last name, age, gender) and per registration (what they are celebrating,
-- anything else). full_name stays (first + last name) so older rows and the admin screens keep working.
alter table meal_diners
  add column first_name text,
  add column last_name text,
  add column age smallint check (age is null or (age >= 0 and age <= 120)),
  add column gender text check (gender is null or gender in ('male', 'female', 'other'));

alter table meal_registrations
  add column occasions text[] not null default '{}',
  add column occasion_other text not null default '',
  add column extra_notes text not null default '';
