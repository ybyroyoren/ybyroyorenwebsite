import { redirect } from "next/navigation";
import { accessibleSections, requireAdmin } from "@/lib/admin-auth";

const SECTION_PATH: Record<string, string> = {
  products: "/admin/products",
  media: "/admin/media",
  about_team: "/admin/about-team",
  coupons: "/admin/coupons",
  orders: "/admin/orders",
  pickup_rules: "/admin/pickup-rules",
  meals: "/admin/meals",
  events: "/admin/events",
  messages: "/admin/messages",
  kitchen_ledger: "/admin/kitchen",
  team: "/admin/team",
};

export default async function AdminHomePage() {
  const admin = await requireAdmin();
  const [firstSection] = accessibleSections(admin.role);
  redirect(firstSection ? SECTION_PATH[firstSection] : "/admin/login");
}
