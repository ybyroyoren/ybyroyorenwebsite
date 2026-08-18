import { NextResponse } from "next/server";
import { createPendingRegistration, type DinerInput } from "@/lib/meals";
import { createPaymentRequest } from "@/lib/grow";
import { localePath } from "@/lib/i18n";

interface RegisterBody {
  mealId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  diners: DinerInput[];
  locale?: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as RegisterBody;

  if (
    !body.mealId ||
    !body.customerName?.trim() ||
    !body.customerEmail?.trim() ||
    !body.customerPhone?.trim() ||
    !Array.isArray(body.diners) ||
    body.diners.length === 0
  ) {
    return NextResponse.json({ error: "נא למלא את כל השדות הנדרשים" }, { status: 400 });
  }

  let registrationId: string;
  let depositTotal: number;
  try {
    const result = await createPendingRegistration({
      mealId: body.mealId,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      diners: body.diners,
    });
    registrationId = result.registrationId;
    depositTotal = result.depositTotal;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "משהו השתבש, נסו שוב" },
      { status: 400 }
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const locale = body.locale === "en" ? "en" : "he";
  const payment = await createPaymentRequest({
    items: [{ name: `מקדמה — ${body.diners.length} סועדים`, price: depositTotal, quantity: 1 }],
    description: `מקדמה לארוחה פתוחה — ${registrationId}`,
    customerName: body.customerName,
    customerEmail: body.customerEmail,
    customerPhone: body.customerPhone,
    successUrl: `${siteUrl}${localePath(locale, "/meals/success")}?registrationId=${registrationId}`,
    failUrl: `${siteUrl}${localePath(locale, "/meals")}?failed=1`,
    referenceId: `meal:${registrationId}`,
  });

  return NextResponse.json({ paymentUrl: payment.paymentUrl });
}
