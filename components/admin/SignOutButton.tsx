"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { recordAdminLogout } from "@/lib/actions/admin/session";
import styles from "@/app/admin/admin.module.css";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    try {
      await recordAdminLogout();
    } catch {
      // never block signing out
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
