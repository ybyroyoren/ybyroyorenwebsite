import { redirect } from "next/navigation";

export default function KitchenLedgerHomePage() {
  redirect("/admin/kitchen/events");
}
