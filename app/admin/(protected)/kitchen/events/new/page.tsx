import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getGuestsList, getRecipes } from "@/lib/kitchen/data";
import { getActiveTeamNames } from "@/lib/team";
import { prefillFromInquiry } from "@/lib/kitchen/inquiryPrefill";
import { EventEditorForm, type EventPrefill } from "@/components/admin/kitchen/EventEditorForm";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function NewEventPage({ searchParams }: { searchParams: Promise<{ date?: string; inquiry?: string }> }) {
  const admin = await requireAdmin();
  if (admin.role !== "owner") redirect("/admin/kitchen/events");

  const { date, inquiry } = await searchParams;
  const [recipes, guests, staffNames] = await Promise.all([getRecipes(), getGuestsList(), getActiveTeamNames()]);
  const dishRecipes = recipes.filter((r) => r.type === "dish").map((r) => ({ id: r.id, name: r.name, baseUnit: r.baseUnit }));

  let prefill: EventPrefill = {};
  if (inquiry) {
    const { data } = await supabaseAdmin().from("event_inquiries").select("*").eq("id", inquiry).maybeSingle();
    if (data) prefill = prefillFromInquiry(data);
  }
  if (date && ISO_DATE.test(date)) prefill = { ...prefill, date };

  return (
    <>
      <h1>תיק אירוע חדש</h1>
      <EventEditorForm dishRecipes={dishRecipes} guests={guests} staffNames={staffNames} prefill={prefill} />
    </>
  );
}
