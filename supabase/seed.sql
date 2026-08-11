-- Sample data ported from the design prototypes, for local development only.
-- Real content is fully editable from the admin panel — see spec §9.

insert into products (slug, name, description, category, allergens, sort_order) values
  ('cheesecake-classic', 'עוגת גבינה קלאסית', 'עוגת גבינה אפויה, בסיס פירורי חמאה', 'desserts', 'גלוטן, ביצים, חלב', 1),
  ('almond-tahini', 'טחינת שקדים גולמית', 'שקדים קלויים טחונים, ללא תוספות', 'spreads', 'אגוזים (שקדים)', 2),
  ('potato-gnocchi', 'ניוקי תפוחי אדמה', 'ניוקי ביתי, מוכן להקפאה או בישול מיידי', 'pasta', 'גלוטן, ביצים', 3),
  ('tomato-sauce-frozen', 'רוטב עגבניות קפוא', 'רוטב עגבניות בישול איטי, 500 מ״ל', 'frozen', 'ללא אלרגנים ידועים', 4),
  ('chocolate-cake', 'עוגת שוקולד עמוקה', 'שוקולד 70%, טקסטורה עשירה', 'desserts', 'גלוטן, ביצים, חלב, אגוזים', 5),
  ('granola', 'גרנולה ביתית', 'שיבולת שועל, אגוזים, דבש, 400 גרם', 'spreads', 'גלוטן, אגוזים', 6),
  ('pesto-frozen', 'רוטב פסטו קפוא', 'בזיליקום טרי, שמן זית כתית, 300 מ״ל', 'frozen', 'אגוזי צנובר, חלב (פרמזן)', 7),
  ('cheese-ravioli', 'רביולי גבינות', 'בצק דק, מילוי גבינות איטלקיות', 'pasta', 'גלוטן, ביצים, חלב', 8);

insert into product_sizes (product_id, label, price_before_vat, sort_order)
  select id, 'קטנה (16 ס״מ)', 75, 1 from products where slug = 'cheesecake-classic'
  union all select id, 'רגילה (22 ס״מ)', 89, 2 from products where slug = 'cheesecake-classic'
  union all select id, 'גדולה (28 ס״מ)', 123, 3 from products where slug = 'cheesecake-classic'
  union all select id, '350 גרם', 48, 1 from products where slug = 'almond-tahini'
  union all select id, '500 גרם', 42, 1 from products where slug = 'potato-gnocchi'
  union all select id, '500 מ״ל', 36, 1 from products where slug = 'tomato-sauce-frozen'
  union all select id, 'קטנה (16 ס״מ)', 79, 1 from products where slug = 'chocolate-cake'
  union all select id, 'רגילה (22 ס״מ)', 94, 2 from products where slug = 'chocolate-cake'
  union all select id, 'גדולה (28 ס״מ)', 129, 3 from products where slug = 'chocolate-cake'
  union all select id, '400 גרם', 39, 1 from products where slug = 'granola'
  union all select id, '300 מ״ל', 34, 1 from products where slug = 'pesto-frozen'
  union all select id, '400 גרם', 58, 1 from products where slug = 'cheese-ravioli';

insert into coupons (code, discount_pct, active) values
  ('CHEF10', 0.10, true),
  ('WELCOME15', 0.15, true);

insert into meals (title, description, date, total_seats, price_per_seat, menu) values
  ('ערב ים תיכוני', 'שולחן משותף, 5 מנות בהשראת המטבח הים-תיכוני', '2026-08-14', 12, 180,
    '[{"name":"סלטי פתיחה ולחם בית","note":"צמחוני"},{"name":"דג ים צלוי בעשבי תיבול","note":""},{"name":"כתף טלה אפויה לאט","note":""},{"name":"קינוח — קרם קרמל תפוז","note":""}]'::jsonb),
  ('ארוחת בוקר איטלקית', 'בראנץ׳ מלא בהשראת חופי איטליה', '2026-08-22', 14, 140,
    '[{"name":"פריטטה ירקות עונתית","note":""},{"name":"בורטה עם עגבניות שרי","note":"צמחוני"},{"name":"קרפצ׳יו בקר","note":""},{"name":"טירמיסו קלאסי","note":""}]'::jsonb),
  ('שולחן פסטה פתוח', 'ערב פסטה טרייה עם 3 סוגי רטבים ביתיים', '2026-09-04', 10, 160,
    '[{"name":"קרוסטיני שום ועגבניה","note":"צמחוני"},{"name":"טליאטלה ברוטב עגבניות","note":""},{"name":"פפרדלה ברוטב פסטו","note":""},{"name":"פאנה קוטה וניל","note":""}]'::jsonb);

-- pre-fill some taken seats on two meals so the display-tier logic is visible locally
insert into meal_registrations (meal_id, customer_name, customer_email, customer_phone, seats_count, deposit_total, status)
  select id, 'הרשמת דמו', 'demo@example.com', '0500000000', 8, 800, 'paid' from meals where title = 'ערב ים תיכוני'
  union all
  select id, 'הרשמת דמו', 'demo@example.com', '0500000000', 5, 500, 'paid' from meals where title = 'ארוחת בוקר איטלקית';
