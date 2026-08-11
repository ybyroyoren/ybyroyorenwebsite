import { NextResponse } from "next/server";
import { createEventInquiry, type EventInquiryInput } from "@/lib/events";

export async function POST(request: Request) {
  const body = (await request.json()) as EventInquiryInput;

  try {
    const result = await createEventInquiry(body);
    return NextResponse.json({ ok: true, id: result.id });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "משהו השתבש, נסו שוב" },
      { status: 400 }
    );
  }
}
