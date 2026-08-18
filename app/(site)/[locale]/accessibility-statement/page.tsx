// DRAFT — template drafted by an AI assistant based on facts provided by the
// business owner. Recommended for legal review before relying on it,
// particularly the compliance-standard claim below.
import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { resolveLocale } from "@/lib/i18n";

export const metadata: Metadata = { title: "הצהרת נגישות" };

export default async function AccessibilityStatementPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  return (
    <LegalLayout eyebrow="מדיניות" title="הצהרת נגישות" updated="18.08.2026" locale={locale}>
      <h2>מחויבותנו לנגישות</h2>
      <p>
        אנחנו רואים חשיבות רבה במתן שירות שוויוני ונגיש לכלל הגולשים, כולל אנשים עם מוגבלות,
        בהתאם לחוק שוויון זכויות לאנשים עם מוגבלות, התשנ&quot;ח–1998, ולתקנות שוויון זכויות
        לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע&quot;ג–2013. האתר הונגש בהתאם לתקן
        הישראלי (ת&quot;י) 5568 להנגשת תכנים באינטרנט ברמה AA, המבוסס על הנחיות WCAG 2.0 של
        ארגון W3C.
      </p>

      <h2>מה הונגש באתר</h2>
      <ul>
        <li>ניווט מלא באמצעות מקלדת (Tab, Shift+Tab, Enter, Esc)</li>
        <li>סימון ברור וגלוי של הרכיב שבפוקוס</li>
        <li>קישור לדילוג ישיר לתוכן הראשי, המופיע בתחילת כל עמוד בעת ניווט במקלדת</li>
        <li>תוויות ברורות לשדות הטופס</li>
        <li>כיבוד הגדרת מערכת ההפעלה לצמצום אנימציות (prefers-reduced-motion)</li>
        <li>התאמה למסכים בגדלים שונים ולמכשירים ניידים</li>
        <li>אין באתר תוכן מהבהב או הבזקים</li>
      </ul>
      <p>
        בנוסף, בפינת המסך מופיע כפתור תפריט נגישות המאפשר התאמה אישית נוספת של תצוגת האתר:
      </p>
      <ul>
        <li>הגדלה והקטנה של גודל הטקסט</li>
        <li>מצב ניגודיות גבוהה</li>
        <li>הדגשת קישורים בקו תחתון</li>
        <li>עצירת אנימציות ומעברים</li>
        <li>איפוס להגדרות ברירת המחדל</li>
      </ul>

      <h2>מגבלות ידועות</h2>
      <p>
        חלק מהתכנים באתר (כגון שמות ותיאורי מוצרים) מוצגים גם באנגלית. תכנים אלו הונגשו אף הם,
        אך במקרים שבהם טרם הוזן תרגום לאנגלית עבור פריט מסוים, הוא יוצג בעברית גם בגרסה
        האנגלית של האתר. אנחנו ממשיכים לעבוד על שיפור הנגישות באתר באופן שוטף — אם נתקלתם
        בתוכן או רכיב שאינו נגיש עבורכם, נשמח שתדווחו לנו כדי שנוכל לטפל בכך.
      </p>

      <h2>יצירת קשר בנושאי נגישות</h2>
      <p>
        אחראי הנגישות: רוי אורן
        <br />
        טלפון: <a href="tel:0543737307">054-3737-307</a>
        <br />
        אימייל: <a href="mailto:roy@ybyroyoren.com">roy@ybyroyoren.com</a>
      </p>
    </LegalLayout>
  );
}
