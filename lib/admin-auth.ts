import "server-only";
import { redirect } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverAuth";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { AdminRole } from "@/lib/supabase/types";

export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
}

/** Redirects to /admin/login if there's no session or no admin_profiles row. */
export async function requireAdmin(): Promise<AdminUser> {
  const auth = await supabaseServerAuth();
  const {
    data: { user },
  } = await auth.auth.getUser();

  if (!user) redirect("/admin/login");

  const db = supabaseAdmin();
  const { data: profile } = await db
    .from("admin_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/admin/login");

  return { id: user.id, email: user.email ?? "", role: profile.role };
}

/**
 * Permission matrix per the spec (§7): owner sees everything; kitchen/sales
 * are scoped to what they need for their job. Order here also doubles as
 * the priority list `/admin` uses to pick a landing page per role.
 */
export type AdminSection =
  | "products"
  | "media"
  | "coupons"
  | "orders"
  | "meals"
  | "events"
  | "messages"
  | "team"
  | "kitchen_ledger";

export const SECTION_ROLES: Record<AdminSection, AdminRole[]> = {
  products: ["owner", "kitchen"],
  media: ["owner"],
  coupons: ["owner"],
  orders: ["owner", "kitchen"],
  meals: ["owner", "kitchen", "sales"],
  events: ["owner", "sales"],
  messages: ["owner"],
  team: ["owner"],
  // Everyone can view + check off prep items; only the owner can edit the
  // underlying data (ingredients, prices, recipes, equipment). That finer
  // distinction is enforced per-action in lib/actions/admin/kitchen-*.ts,
  // not here — this just gates whether the section is visible at all.
  kitchen_ledger: ["owner", "kitchen", "sales"],
};

export function accessibleSections(role: AdminRole): AdminSection[] {
  return (Object.keys(SECTION_ROLES) as AdminSection[]).filter((section) =>
    SECTION_ROLES[section].includes(role)
  );
}

/** Like requireAdmin(), but also redirects to /admin if the role can't see this section. */
export async function requireAdminSection(section: AdminSection): Promise<AdminUser> {
  const admin = await requireAdmin();
  if (!SECTION_ROLES[section].includes(admin.role)) redirect("/admin");
  return admin;
}
