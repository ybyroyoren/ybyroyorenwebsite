import { createBrowserClient } from "@supabase/ssr";

// Anon client for the browser. Used only for the admin login form — every
// other data access happens server-side via supabaseAdmin().
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
