import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { getEventById, getGuestsList, getRecipes } from "@/lib/kitchen/data";
import { EventEditorForm } from "@/components/admin/kitchen/EventEditorForm";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (admin.role !== "owner") redirect("/admin/kitchen/events");

  const { id } = await params;
  const [event, recipes, guests] = await Promise.all([getEventById(id), getRecipes(), getGuestsList()]);
  if (!event) notFound();

  const dishRecipes = recipes.filter((r) => r.type === "dish").map((r) => ({ id: r.id, name: r.name, baseUnit: r.baseUnit }));

  return (
    <>
      <h1>עריכת אירוע — {event.name}</h1>
      <EventEditorForm eventId={id} initial={event} dishRecipes={dishRecipes} guests={guests} />
    </>
  );
}
