"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import styles from "@/app/admin/admin.module.css";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
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
