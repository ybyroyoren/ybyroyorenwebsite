import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createRecipe, type RecipeInput } from "@/lib/kitchen/mutations";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (admin.role !== "owner") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const input = (await request.json()) as RecipeInput;
  const result = await createRecipe(input);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ id: result.id });
}
