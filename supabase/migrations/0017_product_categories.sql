-- A product can now sit in several shop categories. The join table is the
-- source of truth; products.category is left in place as a legacy column
-- (no longer required, no longer a foreign key, no longer read or written).

create table product_categories (
  product_id uuid not null references products(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  primary key (product_id, category_id)
);

alter table product_categories enable row level security;

-- Every product keeps the category it had.
insert into product_categories (product_id, category_id)
select p.id, c.id
from products p
join categories c on c.slug = p.category
on conflict do nothing;

-- Deleting a category must always be possible (its products just lose that tag).
alter table products drop constraint if exists products_category_fkey;
alter table products alter column category drop not null;
