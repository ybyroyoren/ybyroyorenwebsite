import { requireAdminSection } from "@/lib/admin-auth";
import { KitchenSubnav } from "./KitchenSubnav";

export default async function KitchenLedgerLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSection("kitchen_ledger");

  return (
    <>
      <KitchenSubnav />
      {children}
    </>
  );
}
