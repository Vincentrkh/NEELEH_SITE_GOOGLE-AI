import Link from "next/link";
import { db } from "@/lib/db";
import { localeNumber, tierLabel } from "@/lib/format";
import { getServerLang } from "@/lib/i18n";
import { Reveal } from "@/lib/motion-effects";
import { getSkin } from "@/lib/skin";
import { TmTeamArchive } from "@/components/tm/tm-team-archive";
import { BrandLogoGraphic } from "@/components/brand-logo";

export const dynamic = "force-dynamic";

export default async function InstructorsPage() {
  const lang = await getServerLang();
  const fa = lang === "fa";
  const instructors = await db.user.findMany({
    where: {
      coursesTaught: { some: { published: true } },
    },
    select: {
      id: true,
      name: true,
      nameEn: true,
      bio: true,
      bioEn: true,
      field: true,
      education: true,
      avatarUrl: true,
      coursesTaught: {
        where: { published: true },
        select: { id: true, title: true, slug: true, tier: true },
      },
    },
  });

  // ── پوسته دوم: Tres Mares — قالب آرشیو تیم با فیلتر واقعی ──
  const skin = await getSkin();
  if (skin === "tresmares") {
    return (
      <TmTeamArchive
        people={instructors.map((p) => ({
          id: p.id,
          name: fa ? p.name : (p.nameEn || p.name),
          bio: fa ? p.bio : (p.bioEn || p.bio),
          field: p.field,
          education: p.education,
          avatarUrl: p.avatarUrl,
          courseCount: p.coursesTaught.length,
        }))}
      />
    );
  }

  return (
    <main className="min-h-[100svh]">
      <header className="border-b border-border">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 min-h-[44px]">
            <BrandLogoGraphic
              maxHeight={34}
              fallback={<img src="/logo-fill.svg" alt="Neeleh" className="w-7 h-7 object-contain" />}
            />
            <span className="text-sm font-medium">{fa ? "آکادمی نیله" : "Neeleh Academy"}</span>
          </Link>
          <Link href="/courses" className="text-xs uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors">
            {fa ? "دوره‌ها" : "Courses"}
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-12 sm:py-16">
        <div className="mb-12">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">[{fa ? " مدرسین " : " Instructors "}]</p>
          <h1 className="text-4xl sm:text-6xl font-medium tracking-[-0.04em] leading-[0.95]">
            {fa ? "آدم‌هایی که" : "People who have"}
            <br />
            {fa ? "مسیر را رفته‌اند" : "walked the path"}
          </h1>
          <p className="mt-6 text-base sm:text-lg leading-relaxed text-muted-foreground max-w-xl">
            {fa
              ? "مدرسین نیله تجربه‌ی واقعی دفاتر معماری را دارند — نه فقط آموزش تئوری."
              : "Neeleh instructors bring real architecture-office experience — not just theory."}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {instructors.map((inst, i) => (
            <Reveal key={inst.id} delay={i * 100}>
              <Link
                href={`/instructors/${inst.id}`}
                className="group block rounded-lg border border-border bg-card overflow-hidden hover:border-foreground/30 transition-colors"
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-start gap-4">
                    {inst.avatarUrl ? (
                      <img src={inst.avatarUrl} alt={fa ? inst.name : (inst.nameEn || inst.name)} className="size-14 rounded-full object-cover" />
                    ) : (
                      <div className="size-14 rounded-full bg-foreground/5 border border-border flex items-center justify-center text-lg font-medium">
                        {(fa ? inst.name : (inst.nameEn || inst.name)).charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h2 className="font-medium text-base group-hover:text-foreground transition-colors">
                        <bdi>{fa ? inst.name : (inst.nameEn || inst.name)}</bdi>
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">{inst.field}</p>
                    </div>
                  </div>

                  {(fa ? inst.bio : (inst.bioEn || inst.bio)) && (
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                      {fa ? inst.bio : (inst.bioEn || inst.bio)}
                    </p>
                  )}

                  {inst.education && (
                    <p className="text-xs text-muted-foreground/70 leading-relaxed border-t border-border pt-3">
                      {inst.education}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {inst.coursesTaught.slice(0, 4).map((c) => (
                      <span key={c.id} className="text-[10px] uppercase tracking-[0.1em] border border-border px-1.5 py-0.5 text-muted-foreground">
                        {tierLabel(lang, c.tier)}
                      </span>
                    ))}
                    {inst.coursesTaught.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {localeNumber(lang, inst.coursesTaught.length)} {fa ? "دوره" : "courses"}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </main>
  );
}
