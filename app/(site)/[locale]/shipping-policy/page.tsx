// DRAFT — template drafted by an AI assistant based on facts provided by the
// business owner. Recommended for legal review before relying on it.
import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { resolveLocale } from "@/lib/i18n";

export const metadata: Metadata = { title: "מדיניות משלוחים ואיסוף" };

export default async function ShippingPolicyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  return (
    <LegalLayout eyebrow="מדיניות" title="מדיניות משלוחים ואיסוף" updated="20.07.2026" locale={locale}>
      <h2>איסוף עצמי</h2>
      <p>
        כרגע כל ההזמנות מהחנות נאספות עצמאית מרחוב השוק 34, תל אביב, בתאריך שנבחר בעת התשלום.
        תאריך האיסוף המוקדם ביותר האפשרי מוצג בעגלה ובדף התשלום, ותלוי בזמני ההכנה של המוצרים
        שבחרתם.
      </p>

      <h2>משלוחים</h2>
      <p>
        אין כרגע שירות משלוחים — אנחנו עובדים על כך, ונעדכן כאן ברגע שהאפשרות תהיה זמינה, כולל
        אזורי חלוקה, עלות וזמני אספקה.
      </p>

      <h2>ארוחות פתוחות ואירועים פרטיים</h2>
      <p>
        אלו מתקיימים בחלל האירוח שלנו ברחוב השוק 34, תל אביב, או במיקום אחר שסוכם מראש עבור
        אירועים פרטיים — אין רכיב משלוח בשירותים אלו.
      </p>

      <h2>יצירת קשר</h2>
      <p>
        לשאלות על איסוף ההזמנה שלכם, ניתן לפנות במייל{" "}
        <a href="mailto:roy@ybyroyoren.com">roy@ybyroyoren.com</a> או בטלפון{" "}
        <a href="tel:0543737307">054-3737-307</a>.
      </p>
    </LegalLayout>
  );
}
