import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client. This is the ONLY way the app touches Supabase for
// data (see supabase/migrations/0001_init.sql for why RLS has no policies).
// Never import this from a Client Component.
//
// Deliberately untyped (no <Database> generic): hand-rolling PostgREST
// relationship metadata for nested selects without a live project to run
// `supabase gen types` against is more trouble than it's worth. lib/supabase/types.ts
// documents the Row/Insert/Update shapes and every call site has its own
// explicit return type (see lib/cart.ts's CartItemView, etc.) — swap in real
// generated types once a Supabase project exists.
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase env vars are missing. Copy .env.local.example to .env.local and fill in NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
