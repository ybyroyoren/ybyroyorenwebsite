# Y by Roy Oren — website

Next.js (App Router) + Supabase backend for the shop, open-meal registrations,
and admin panel. See `reference/Y-by-Roy-Oren-website-spec.md` for the full
product spec and `reference/*-prototype.html` for the original design
prototypes this was built from.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com), create a free project.
2. In the SQL editor, run `supabase/migrations/0001_init.sql`, then
   `supabase/migrations/0002_event_inquiries.sql`, then (optional, for sample
   data) `supabase/seed.sql`.
3. In Project Settings → API, copy the Project URL, `anon` key, and
   `service_role` key.

## 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` from step 1. Everything else (Grow, Green
Invoice, Resend) can stay blank for now — see "Stubbed integrations" below.

## 3. Bootstrap the first admin user (Roy)

The admin panel at `/admin` is gated on a Supabase Auth user that also has a
row in `admin_profiles`. There's no self-serve signup by design. To create
the first one:

1. Supabase dashboard → Authentication → Users → **Add user** (email +
   password, e.g. roy@ybyroyoren.com).
2. SQL editor, run (replace the UUID with the user you just created):
   ```sql
   insert into admin_profiles (id, role) values ('<user-id-from-step-1>', 'owner');
   ```
3. Log in at `/admin/login`.

## 4. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stubbed integrations

`lib/grow.ts`, `lib/green-invoice.ts` are placeholders until we have Grow's
and Green Invoice's actual API docs/credentials:

- **Without keys set**: checkout and meal registration still work end to end
  — payment is simulated as instantly successful so you can test the full
  flow (order/registration creation → "payment" → confirmation page →
  receipt stub → confirmation email skipped with a console warning unless
  `RESEND_API_KEY` is set).
- **With `GROW_API_KEY`/`GREEN_INVOICE_API_KEY` set but no client wired up**:
  both throw a clear "not implemented yet" error — that's the signal to fill
  in the real API calls in those two files once we have the integration
  docs.

## Project structure

- `app/(site)/*` — public pages (home, shop, meals, events, about, contact,
  checkout)
- `app/admin/*` — admin panel (`(protected)` route group is auth-gated,
  `login` is not)
- `app/api/*` — cart, coupon validation, meal registration, event inquiries,
  and the Grow webhook
- `lib/*` — Supabase clients, cart/orders/meals/coupons/events logic, pricing
  (VAT) math, and the three external-integration stubs
- `components/*` — organized by feature (cart, shop, meals, checkout,
  contact, events, site-wide nav/footer, admin)
- `supabase/migrations/*.sql` — schema. All tables have RLS enabled with no
  policies — every read/write goes through the Next.js server using the
  service-role key; the browser never talks to Supabase directly except for
  admin login.

## Phase 2 status

The private-events inquiry form (`/events`) is fully wired: submissions are
validated, stored in `event_inquiries`, opt into the newsletter if checked,
and notify Roy by email (stub until `RESEND_API_KEY` is set). Manage
inquiries at `/admin/events` (status: new → contacted → quoted → closed).

Not built yet: multi-role admin permissions (kitchen/sales staff — currently
every admin_profiles row is effectively "owner"), and automated reminder
emails — both were explicitly deferred in the original spec.
