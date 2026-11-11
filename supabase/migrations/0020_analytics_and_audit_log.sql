-- ===== First-party, cookie-less site analytics =====
-- One row per event sent by the browser tracker (components/site/Analytics.tsx)
-- or recorded on the server. No IP address and no persistent identifier is
-- stored: session_id lives in the tab's sessionStorage, visitor_hash is a daily
-- rotating hash computed on the server.

create table analytics_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  session_id text not null,
  visitor_hash text,
  type text not null,
  path text,
  locale text,
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device text,
  browser text,
  os text,
  country text,
  value numeric,
  props jsonb not null default '{}'::jsonb,
  dedupe_key text unique
);

create index analytics_events_created_idx on analytics_events (created_at);
create index analytics_events_type_created_idx on analytics_events (type, created_at);
create index analytics_events_session_idx on analytics_events (session_id);

alter table analytics_events enable row level security;

-- ===== Admin audit log: who did what in the admin panel =====
create table admin_audit_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  admin_id uuid,
  admin_email text,
  admin_role text,
  action text not null,
  entity_type text,
  entity_id text,
  entity_label text,
  changes jsonb,
  ip text,
  user_agent text
);

create index admin_audit_log_created_idx on admin_audit_log (created_at desc);
create index admin_audit_log_admin_idx on admin_audit_log (admin_email, created_at desc);

alter table admin_audit_log enable row level security;

-- ===== Dashboard numbers, computed in one call =====
-- p_from / p_to are the range (to is exclusive). Days are bucketed in Israel time.
create or replace function analytics_summary(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
stable
as $$
with ev as (
  select * from analytics_events where created_at >= p_from and created_at < p_to
),
pv as (select * from ev where type = 'pageview'),
sess as (
  select
    session_id,
    count(*) as pageviews,
    (array_agg(coalesce(nullif(utm_source, ''), nullif(referrer_host, ''), 'direct') order by created_at))[1] as source,
    (array_agg(device order by created_at))[1] as device,
    (array_agg(browser order by created_at))[1] as browser,
    (array_agg(country order by created_at))[1] as country,
    (array_agg(locale order by created_at))[1] as locale,
    (array_agg(path order by created_at))[1] as landing,
    (array_agg(path order by created_at desc))[1] as exit_path
  from pv
  group by session_id
),
dur as (
  select session_id, sum(value) as ms from ev where type = 'page_leave' group by session_id
),
purchased as (select distinct session_id from ev where type = 'purchase'),
carted as (select distinct session_id from ev where type = 'add_to_cart'),
days as (
  select d::date as day
  from generate_series(
    (p_from at time zone 'Asia/Jerusalem')::date,
    ((p_to - interval '1 second') at time zone 'Asia/Jerusalem')::date,
    interval '1 day'
  ) d
),
daily as (
  select
    (created_at at time zone 'Asia/Jerusalem')::date as day,
    count(*) as pageviews,
    count(distinct session_id) as sessions,
    count(distinct visitor_hash) as visitors
  from pv
  group by 1
),
step as (
  select
    count(distinct session_id) filter (where type = 'pageview' and path ~ '^(/en)?/shop') as shop_visit,
    count(distinct session_id) filter (where type = 'product_view') as product_view,
    count(distinct session_id) filter (where type = 'add_to_cart') as add_to_cart,
    count(distinct session_id) filter (where type = 'checkout_start') as checkout_start,
    count(distinct session_id) filter (where type = 'checkout_submit') as checkout_submit,
    count(distinct session_id) filter (where type = 'purchase') as purchase,
    count(distinct session_id) filter (where type = 'pageview' and path ~ '^(/en)?/meals') as meals_visit,
    count(distinct session_id) filter (where type = 'meal_register_open') as meal_register_open,
    count(distinct session_id) filter (where type = 'meal_register_submit') as meal_register_submit,
    count(distinct session_id) filter (where type = 'meal_paid') as meal_paid,
    count(distinct session_id) filter (where type = 'pageview' and path ~ '^(/en)?/events') as events_visit,
    count(distinct session_id) filter (where type = 'event_inquiry_open') as event_inquiry_open,
    count(distinct session_id) filter (where type = 'event_inquiry_submit') as event_inquiry_submit,
    count(distinct session_id) filter (where type = 'pageview' and path ~ '^(/en)?/contact') as contact_visit,
    count(distinct session_id) filter (where type = 'contact_submit') as contact_submit,
    count(distinct session_id) filter (where type = 'newsletter_signup') as newsletter_signup
  from ev
)
select jsonb_build_object(
  'totals', (
    select jsonb_build_object(
      'sessions', (select count(*) from sess),
      'visitors', (select count(distinct visitor_hash) from pv),
      'pageviews', (select count(*) from pv),
      'avg_duration_ms', (select coalesce(avg(coalesce(dur.ms, 0)), 0) from sess left join dur using (session_id)),
      'bounce_sessions', (select count(*) from sess where pageviews = 1),
      'purchase_sessions', (select count(*) from sess join purchased using (session_id)),
      'cart_sessions', (select count(*) from sess join carted using (session_id)),
      'abandoned_cart_sessions', (select count(*) from carted c where not exists (select 1 from purchased p where p.session_id = c.session_id))
    )
  ),
  'active_now', (select count(distinct session_id) from analytics_events where created_at > now() - interval '5 minutes'),
  'daily', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'day', days.day,
      'pageviews', coalesce(daily.pageviews, 0),
      'sessions', coalesce(daily.sessions, 0),
      'visitors', coalesce(daily.visitors, 0)
    ) order by days.day), '[]'::jsonb)
    from days left join daily using (day)
  ),
  'hourly', (
    select coalesce(jsonb_agg(jsonb_build_object('hour', h, 'pageviews', coalesce(c, 0)) order by h), '[]'::jsonb)
    from generate_series(0, 23) h
    left join (
      select extract(hour from created_at at time zone 'Asia/Jerusalem')::int as hr, count(*) as c from pv group by 1
    ) x on x.hr = h
  ),
  'weekday', (
    select coalesce(jsonb_agg(jsonb_build_object('dow', w, 'pageviews', coalesce(c, 0)) order by w), '[]'::jsonb)
    from generate_series(0, 6) w
    left join (
      select extract(dow from created_at at time zone 'Asia/Jerusalem')::int as dw, count(*) as c from pv group by 1
    ) x on x.dw = w
  ),
  'pages', (
    select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
      select
        pv.path,
        count(*) as views,
        count(distinct pv.session_id) as sessions,
        (select avg(value) from ev l where l.type = 'page_leave' and l.path = pv.path) as avg_ms,
        (select avg((l.props->>'scroll')::numeric) from ev l where l.type = 'page_leave' and l.path = pv.path and l.props ? 'scroll') as avg_scroll,
        (select count(*) from sess s where s.exit_path = pv.path) as exits,
        (select count(*) from sess s where s.landing = pv.path) as entrances
      from pv
      group by pv.path
      order by views desc
      limit 30
    ) t
  ),
  'sources', (
    select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
      select
        s.source,
        count(*) as sessions,
        count(*) filter (where exists (select 1 from carted c where c.session_id = s.session_id)) as carts,
        count(*) filter (where exists (select 1 from purchased p where p.session_id = s.session_id)) as purchases
      from sess s
      group by s.source
      order by sessions desc
      limit 15
    ) t
  ),
  'devices', (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (select coalesce(device, 'unknown') as name, count(*) as sessions from sess group by 1 order by 2 desc) t),
  'browsers', (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (select coalesce(browser, 'unknown') as name, count(*) as sessions from sess group by 1 order by 2 desc limit 8) t),
  'countries', (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (select coalesce(country, 'unknown') as name, count(*) as sessions from sess group by 1 order by 2 desc limit 10) t),
  'locales', (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (select coalesce(locale, 'unknown') as name, count(*) as sessions from sess group by 1 order by 2 desc) t),
  'funnels', (select to_jsonb(step) from step),
  'products', (
    select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
      select
        coalesce(props->>'name', props->>'slug') as name,
        count(*) filter (where type = 'product_view') as views,
        count(*) filter (where type = 'add_to_cart') as carts
      from ev
      where type in ('product_view', 'add_to_cart') and coalesce(props->>'name', props->>'slug') is not null
      group by 1
      order by views desc, carts desc
      limit 20
    ) t
  ),
  'sold', (
    select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
      select oi.product_name as name, sum(oi.qty)::int as qty, sum(oi.qty * oi.unit_price) as revenue
      from order_items oi
      join orders o on o.id = oi.order_id
      where o.status = 'paid' and o.created_at >= p_from and o.created_at < p_to
      group by oi.product_name
      order by revenue desc
      limit 20
    ) t
  ),
  'revenue', jsonb_build_object(
    'orders', (select count(*) from orders where status = 'paid' and created_at >= p_from and created_at < p_to),
    'orders_total', (select coalesce(sum(total), 0) from orders where status = 'paid' and created_at >= p_from and created_at < p_to),
    'meal_registrations', (select count(*) from meal_registrations where status = 'paid' and created_at >= p_from and created_at < p_to),
    'meal_deposits', (select coalesce(sum(deposit_total), 0) from meal_registrations where status = 'paid' and created_at >= p_from and created_at < p_to)
  ),
  'clicks', (
    select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
      select props->>'label' as label, props->>'kind' as kind, count(*) as clicks
      from ev
      where type = 'click' and coalesce(props->>'label', '') <> ''
      group by 1, 2
      order by clicks desc
      limit 25
    ) t
  ),
  'filters', (
    select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
      select props->>'filter' as filter, props->>'value' as value, count(*) as uses
      from ev
      where type = 'filter_use'
      group by 1, 2
      order by uses desc
      limit 20
    ) t
  ),
  'errors', (
    select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
      select props->>'message' as message, path, count(*) as occurrences
      from ev
      where type = 'js_error'
      group by 1, 2
      order by occurrences desc
      limit 10
    ) t
  )
);
$$;
