import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Read-only auth client for Server Components — checks who's logged in via
// the session cookie the browser client (lib/supabase/browser.ts) sets on
// sign-in. Never used for data access; see lib/supabase/server.ts for that.
export async function supabaseServerAuth() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
      },
    }
  );
}
