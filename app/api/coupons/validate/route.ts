import { NextResponse } from "next/server";
import { validateCoupon } from "@/lib/coupons";

export async function POST(request: Request) {
  const { code } = await request.json();
  if (typeof code !== "string") {
    return NextResponse.json({ valid: false, message: "" }, { status: 400 });
  }

  const result = await validateCoupon(code);
  return NextResponse.json(result);
}
