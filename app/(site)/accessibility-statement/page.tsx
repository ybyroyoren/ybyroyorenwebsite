// DRAFT — template drafted by an AI assistant based on facts provided by the
// business owner. Recommended for legal review before relying on it,
// particularly the compliance-standard claim below.
import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/LegalLayout";

export const metadata: Metadata = { title: "הצהרת נגישות" };

export default function AccessibilityStatementPage() {
  return (
    <LegalLayout eyebrow="מדיניות" title="הצהרת נגישות" updated="20.07.2026">
      <h2>מחויבותנו לנגישות</h2>
      <p>
        אנחנו רואים חשיבות רבה במתן שירות שוויוני ונגיש לכלל הגולשים, כולל אנשים עם מוגבלות,
        ופועלים להנגשת האתר בהתאם לתקן הישראלי (ת&quot;י) 5568 להנגשת תכנים באינטרנט, המבוסס על
        הנחיות WCAG 2.0 ברמה AA.
      </p>

      <h2>התאמות הנגישות באתר</h2>
      <p>
        בפינת המסך מופיע כפתור תפריט נגישות, המאפשר להתאים את תצוגת האתר:
      </p>
      <ul>
        <li>הגדלה והקטנה של גודל הטקסט</li>
        <li>מצב ניגודיות גבוהה</li>
        <li>הדגשת קישורים בקו תחתון</li>
        <li>עצירת אנימציות ומעברים</li>
        <li>איפוס להגדרות ברירת המחדל</li>
      </ul>
      <p>האתר בנוי כך שניתן לנווט בו גם באמצעות מקלדת בלבד.</p>

      <h2>מגבלות ידועות</h2>
      <p>
        אנחנו ממשיכים לעבוד על שיפור הנגישות באתר. אם נתקלתם בתוכן או רכיב שאינו נגיש עבורכם,
        נשמח שתדווחו לנו כדי שנוכל לטפל בכך.
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
