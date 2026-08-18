// DRAFT — template drafted by an AI assistant based on facts provided by the
// business owner. Recommended for legal review before relying on it.
import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { resolveLocale } from "@/lib/i18n";

export const metadata: Metadata = { title: "מדיניות עוגיות" };

export default async function CookiePolicyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  return (
    <LegalLayout eyebrow="מדיניות" title="מדיניות עוגיות (Cookies)" updated="20.07.2026" locale={locale}>
      <h2>מה זו עוגייה</h2>
      <p>
        עוגייה (cookie) היא קובץ טקסט קטן שנשמר בדפדפן שלכם בעת גלישה באתר, ומשמש לזכור מידע בין
        עמודים או בין ביקורים.
      </p>

      <h2>אילו עוגיות אנחנו משתמשים בהן</h2>
      <p>
        כרגע אנחנו משתמשים <strong>אך ורק</strong> בעוגייה חיונית אחת, הנדרשת לתפקוד הבסיסי של
        האתר:
      </p>
      <ul>
        <li>
          <strong>cart_session</strong> — עוגייה טכנית (httpOnly) שמזהה את עגלת הקניות שלכם בין
          עמוד לעמוד, כדי שהיא לא תתאפס תוך כדי גלישה. אינה משמשת למעקב, פרסום או איסוף מידע
          שיווקי, ואינה משותפת עם צדדים שלישיים. תוקפה עד שנה מהביקור האחרון, או עד שתמחקו עוגיות
          מהדפדפן.
        </li>
      </ul>
      <p>
        מכיוון שמדובר בעוגייה חיונית לתפעול העגלה, היא נטענת אוטומטית ואינה טעונה הסכמה נפרדת —
        בהתאם לפרקטיקה המקובלת לעוגיות מסוג זה.
      </p>

      <h2>עוגיות אנליטיקס ושיווק</h2>
      <p>
        האתר <strong>אינו</strong> משתמש כיום בכלי אנליטיקס (כגון Google Analytics) או פרסום
        ממוקד (כגון Facebook Pixel). אם וכאשר נוסיף כלים כאלה בעתיד, נעדכן מדיניות זו ונציג באנר
        הסכמה מפורש לפני טעינתם.
      </p>

      <h2>ניהול עוגיות בדפדפן</h2>
      <p>
        ניתן לחסום או למחוק עוגיות דרך הגדרות הדפדפן. שימו לב שחסימת העוגייה החיונית עלולה למנוע
        מהעגלה לפעול כראוי.
      </p>

      <h2>יצירת קשר</h2>
      <p>
        לשאלות בנושא, ניתן לפנות במייל{" "}
        <a href="mailto:roy@ybyroyoren.com">roy@ybyroyoren.com</a>.
      </p>
    </LegalLayout>
  );
}
