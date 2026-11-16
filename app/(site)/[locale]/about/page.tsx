import type { Metadata } from "next";
import { getMediaByLocation } from "@/lib/media";
import { getPublicTeam } from "@/lib/team";
import { resolveLocale } from "@/lib/i18n";
import { getDict } from "@/lib/dictionary";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "אודות" };

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const [[heroImage], team] = await Promise.all([getMediaByLocation("about_hero"), getPublicTeam()]);
  const t = getDict(locale).about;

  return (
    <>
    <div className={`wrap ${styles.hero}`}>
      <div className="enter">
        <div className={styles.eyebrow}>{t.eyebrow}</div>
        <h1>
          {t.heading[0]}
          <br />
          {t.heading[1]}
        </h1>
        <p>{t.body}</p>
      </div>
      <div className={`${styles.visual} ${heroImage ? styles.hasPhoto : ""} enterScale`} style={{ "--i": 1 } as React.CSSProperties}>
        {heroImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.photo} src={heroImage.url} alt={t.photoAlt} />
        )}
      </div>
    </div>

    {team.length > 0 && (
      <section className={`wrap ${styles.team}`}>
        <div className={styles.eyebrow} data-reveal="">
          {t.teamEyebrow}
        </div>
        <h2 className="displayHeading" data-reveal="">{t.teamHeading}</h2>
        <div className={styles.teamGrid}>
          {team.map((member) => {
            const name = (locale === "en" && member.nameEn) || member.name;
            const role = (locale === "en" && member.roleEn) || member.role;
            const bio = (locale === "en" && member.bioEn) || member.bio;
            return (
              <article key={member.id} className={styles.member} data-reveal="">
                <div className={`${styles.memberPhoto} ${member.imageUrl ? styles.hasPhoto : ""}`}>
                  {member.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.imageUrl} alt={name} loading="lazy" />
                  ) : (
                    <span aria-hidden="true">{name.slice(0, 1)}</span>
                  )}
                </div>
                <h3>{name}</h3>
                {role && <div className={styles.memberRole}>{role}</div>}
                {bio && <p>{bio}</p>}
              </article>
            );
          })}
        </div>
      </section>
    )}
    </>
  );
}
