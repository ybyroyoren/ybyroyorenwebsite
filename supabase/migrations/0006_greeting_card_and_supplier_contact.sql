-- Greeting card add-on for shop orders
alter table orders
  add column greeting_card_message text,
  add column greeting_card_fee numeric(10,2) not null default 0;

alter table orders
  add constraint orders_greeting_card_message_length
  check (greeting_card_message is null or char_length(greeting_card_message) <= 200);

-- Supplier contact details
alter table kl_suppliers
  add column phone text not null default '',
  add column email text not null default '';
