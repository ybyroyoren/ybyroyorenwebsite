import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { getGuestsList, getRecipes } from "@/lib/kitchen/data";
import { EventEditorForm } from "@/components/admin/kitchen/EventEditorForm";

export default async function NewEventPage() {
  const admin = await requireAdmin();
  if (admin.role !== "owner") redirect("/admin/kitchen/events");

  const [recipes, guests] = await Promise.all([getRecipes(), getGuestsList()]);
  const dishRecipes = recipes.filter((r) => r.type === "dish").map((r) => ({ id: r.id, name: r.name, baseUnit: r.baseUnit }));

  return (
    <>
      <h1>אירוע חדש</h1>
      <EventEditorForm dishRecipes={dishRecipes} guests={guests} />
    </>
  );
}
