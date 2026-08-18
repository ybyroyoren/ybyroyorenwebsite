// DRAFT — template drafted by an AI assistant based on facts provided by the
// business owner. Recommended for legal review before relying on it,
// especially the "no returns" clause below — Israeli consumer-protection law
// sets certain baseline rights that generally can't be waived by policy
// alone (e.g. for a defective or materially wrong item); worth double-
// checking with a lawyer even though the storefront items are perishable
// prepared food.
import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { getLocale } from "@/lib/i18n";

export const metadata: Metadata = { title: "מדיניות החזרות וביטולים" };

export default async function ReturnsPolicyPage() {
  const locale = await getLocale();
  return (
    <LegalLayout eyebrow="מדיניות" title="מדיניות החזרות, ביטולים והחלפות" updated="20.07.2026" locale={locale}>
      <h2>מוצרי החנות (עוגות, ממרחים, קפואים, פסטה)</h2>
      <p>
        כל המוצרים בחנות מיוצרים טריים לפי הזמנה. בשל אופיים כמזון מתכלה, <strong>אין אפשרות
        להחזרה, החלפה או ביטול</strong> לאחר איסוף ההזמנה.
      </p>
      <p>
        אם התקבל מוצר פגום או שגוי, נשמח שתפנו אלינו בהקדם האפשרי לאחר האיסוף כדי שנוכל לבדוק
        ולפתור את הבעיה.
      </p>

      <h2>ארוחות פתוחות</h2>
      <p>
        הרשמה לארוחה פתוחה כוללת מקדמה. ניתן לבטל את ההרשמה ולקבל החזר מלא של המקדמה עד 96 שעות
        (4 ימים) לפני מועד הארוחה. פרטים נוספים בעמוד{" "}
        <a href="/meals">ארוחות פתוחות</a>.
      </p>

      <h2>אירועים פרטיים</h2>
      <p>
        אירועים פרטיים אינם כוללים תשלום מקוון — טופס הפנייה הוא לבקשת הצעת מחיר בלבד, ותנאי
        התשלום והביטול לאירוע ייקבעו מול רוי אורן באופן אישי לפני אישור האירוע.
      </p>

      <h2>יצירת קשר</h2>
      <p>
        לכל שאלה על הזמנה ספציפית, ניתן לפנות במייל{" "}
        <a href="mailto:roy@ybyroyoren.com">roy@ybyroyoren.com</a> או בטלפון{" "}
        <a href="tel:0543737307">054-3737-307</a>.
      </p>
    </LegalLayout>
  );
}
