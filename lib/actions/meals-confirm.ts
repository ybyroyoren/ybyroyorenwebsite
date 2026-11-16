"use server";

import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";
import { finalizeMealRegistration, getFreeRegistrationToConfirm } from "@/lib/meals";
import { localePath } from "@/lib/i18n";

/**
 * The last step for a registration whose deposit a coupon covered completely: nothing to pay, so instead of the
 * payment page the visitor sees a summary and confirms here. Only a still-pending registration with a zero deposit
 * can be confirmed this way; anything that needs payment goes through the payment page and its webhook.
 */
export async function confirmFreeRegistration(formData: FormData): Promise<void> {
  const registrationId = String(formData.get("registrationId") ?? "");
  const locale = formData.get("locale") === "en" ? "en" : "he";
  const target = localePath(locale, "/meals/success");

  const toConfirm = registrationId ? await getFreeRegistrationToConfirm(registrationId) : null;
  if (!toConfirm || toConfirm.problem === "not-free") redirect(localePath(locale, "/meals"));
  if (toConfirm.problem) redirect(`${localePath(locale, "/meals/confirm")}?registrationId=${registrationId}&error=${toConfirm.problem}`);

  await finalizeMealRegistration(registrationId, null);
  revalidateTag(CACHE_TAGS.meals, "max");
  revalidatePath("/meals");
  revalidatePath("/en/meals");
  redirect(`${target}?registrationId=${registrationId}`);
}
