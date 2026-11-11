"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { recordAdminLogout } from "@/lib/actions/admin/session";
import styles from "@/app/admin/admin.module.css";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    try {
      // Never block signing out on the log entry: give it a moment, then carry on.
      await Promise.race([recordAdminLogout(), new Promise((resolve) => setTimeout(resolve, 1500))]);
    } catch {
      /* ignore */
    }
    await supabaseBrowser().auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button type="button" className={styles.signOut} onClick={handleSignOut}>
      התנתקות
    </button>
  );
}
