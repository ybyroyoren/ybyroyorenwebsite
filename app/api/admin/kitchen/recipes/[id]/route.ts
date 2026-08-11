import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { deleteRecipe, updateRecipe, type RecipeInput } from "@/lib/kitchen/mutations";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (admin.role !== "owner") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const { id } = await params;
  const input = (await request.json()) as RecipeInput;
  const result = await updateRecipe(id, input);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (admin.role !== "owner") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const { id } = await params;
  await deleteRecipe(id);
  return NextResponse.json({ ok: true });
}
