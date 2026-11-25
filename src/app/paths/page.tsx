import Link from "next/link";
import { db } from "@/lib/db";
import { localeNumber, localePrice } from "@/lib/format";
import { getServerLang } from "@/lib/i18n";
import { pickString } from "@/lib/content";
import { Reveal } from "@/lib/motion-effects";
import { PublicShell } from "@/components/public-shell";
import { CourseSoftwareArtwork } from "@/components/course-software-svg";
import { getSkin } from "@/lib/skin";
import { TmPaths } from "@/components/tm/tm-paths";

export const dynamic = "force-dynamic";

export default async function PathsPage() {
  const lang = await getServerLang();
  const skin = await getSkin();

  const courses = await db.course.findMany({
    where: { published: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true, slug: true, title: true, titleEn: true, tier: true,
      category: true, description: true, descriptionEn: true,
      durationHrs: true, price: true,
    },
  });

  const localizedCourses = courses.map((c) => ({
    ...c,
    title: pickString(lang, c.title, c.titleEn),
    description: pickString(lang, c.description, c.descriptionEn),
  }));

  const paths = [
    {
      key: "BEGINNER",
      title: lang === "fa" ? "مسیر ورود به بازار کار" : "Career-entry path",
      subtitle: lang === "fa" ? "از دانشجو به نیروی آماده‌ی استخدام" : "From student to hire-ready",
      description: lang === "fa"
        ? "این مسیر برای کسانی است که تازه شروع کرده‌اند. پس از تکمیل این دوره‌ها، می‌توانید در یک دفتر معماری به‌عنوان نقشه‌کش یا طراح شروع به کار کنید."
        : "For those just starting out. After completing these courses you can apply for junior roles at an architecture office.",
      duration: lang === "fa" ? "۸۰-۱۳۶ ساعت" : "80–136 hours",
      outcome: lang === "fa" ? "آمادگی کامل برای استخدام در دفتر معماری" : "Fully prepared for employment at an architecture office",
      courses: localizedCourses.filter((c) => c.tier === "BEGINNER"),
      color: "emerald",
    },
    {
      key: "INTERMEDIATE",
      title: lang === "fa" ? "مسیر توسعه‌ی مهارت" : "Skill-development path",
      subtitle: lang === "fa" ? "از نقشه‌کش به متخصص مدلسازی و رندر" : "From draftsman to modeling & render specialist",
      description: lang === "fa"
        ? "پس از تسلط بر ابزارهای پایه، این مسیر شما را به متخصص رندرینگ، مدلسازی پیشرفته و مدیریت دفتر تبدیل می‌کند."
        : "Once you master the basics, this path takes you to advanced modeling, rendering and project workflows.",
      duration: lang === "fa" ? "۱۰۰-۱۳۶ ساعت" : "100–136 hours",
      outcome: lang === "fa" ? "تخصص در مدلسازی پیشرفته، رندر و متره" : "Specialization in advanced modeling, rendering and quantity takeoff",
      courses: localizedCourses.filter((c) => c.tier === "INTERMEDIATE"),
      color: "amber",
    },
    {
      key: "PRO",
      title: lang === "fa" ? "مسیر متخصص پیشرفته" : "Advanced specialist path",
      subtitle: lang === "fa" ? "طراحی محاسباتی، اتوماسیون و هوش مصنوعی" : "Computational design, automation & AI",
      description: lang === "fa"
        ? "این مسیر برای کسانی است که می‌خواهند در لبه‌ی تکنولوژی معماری بایستند — از طراحی پارامتریک تا AI Agent."
        : "For those who want to work at the edge of architectural technology — from parametric design to AI-assisted workflows.",
      duration: lang === "fa" ? "۱۳۲ ساعت" : "132 hours",
      outcome: lang === "fa" ? "تخصص در طراحی محاسباتی و AI در معماری" : "Specialization in computational design and AI in architecture",
      courses: localizedCourses.filter((c) => c.tier === "PRO"),
      color: "rose",
    },
  ];

  if (skin === "tresmares") {
    return (
      <TmPaths
        paths={paths.map((p, idx) => ({
          key: p.key,
          index: String(idx + 1).padStart(2, "0"),
          title: p.title,
          subtitle: p.subtitle,
          description: p.description,
          duration: p.duration,
          outcome: p.outcome,
          courses: p.courses.map((c) => ({
            id: c.id,
            slug: c.slug,
            title: c.title,
            description: c.description,
            durationHrs: c.durationHrs,
            price: c.price,
          })),
        }))}
      />
    );
  }

  return (
    <PublicShell>
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-12 sm:py-16">
        <div className="mb-12">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
            [{lang === "fa" ? " مسیر یادگیری " : " Learning paths "}]
          </p>
          <h1 className="text-4xl sm:text-6xl font-medium tracking-[-0.04em] leading-[0.95]">
            {lang === "fa" ? "کدام مسیر" : "Which path"}
            <br />
            {lang === "fa" ? "برای شماست؟" : "is yours?"}
          </h1>
          <p className="mt-6 text-base sm:text-lg leading-relaxed text-muted-foreground max-w-xl">
            {lang === "fa"
              ? "سه مسیر شغلی — از ورود به بازار کار تا تخصص در AI معماری. مسیر خود را انتخاب کنید، دوره‌ها به ترتیب اولویت چیده شده‌اند."
              : "Three career paths — from entering the job market to specializing in AI in architecture. Choose your path; courses are listed in priority order."}
          </p>
        </div>

        <div className="space-y-12">
          {paths.map((path, pi) => (
            <Reveal key={path.key} delay={pi * 150}>
              <section className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="p-6 sm:p-8 border-b border-border">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`inline-flex items-center gap-1.5 border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em] ${
                            path.color === "emerald"
                              ? "border-emerald-500/40 text-emerald-700 bg-emerald-50"
                              : path.color === "amber"
                                ? "border-amber-500/40 text-amber-700 bg-amber-50"
                                : "border-rose-500/40 text-rose-700 bg-rose-50"
                          }`}
                        >
                          {lang === "fa"
                            ? `مسیر ${localeNumber(lang, pi + 1)}`
                            : `Path ${localeNumber(lang, pi + 1)}`}
                        </span>
                        <span className="text-xs text-muted-foreground">{path.duration}</span>
                      </div>
                      <h2 className="text-2xl font-medium">{path.title}</h2>
                      <p className="text-sm text-muted-foreground mt-1">{path.subtitle}</p>
                      <p className="text-sm text-muted-foreground/80 mt-3 leading-relaxed max-w-2xl">
                        {path.description}
                      </p>
                    </div>
                    <div className="text-end flex-shrink-0">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        {lang === "fa" ? "خروجی" : "Outcome"}
                      </p>
                      <p className="text-sm font-medium mt-1 max-w-[200px]">{path.outcome}</p>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-border">
                  {path.courses.map((c, ci) => (
                    <Link
                      key={c.id}
                      href={`/courses/${c.slug}`}
                      className="group flex items-center gap-4 p-5 hover:bg-foreground/[0.02] transition-colors"
                    >
                      <div className="hidden sm:block w-20 h-14 flex-shrink-0 border border-border/60 bg-foreground/[0.02] p-1">
                        <CourseSoftwareArtwork slugOrKey={c.slug} compact className="w-full h-full" />
                      </div>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-xs font-mono text-muted-foreground/50 tabular-nums">
                          {localeNumber(lang, ci + 1).padStart(2, lang === "fa" ? "۰" : "0")}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm group-hover:text-foreground transition-colors truncate">
                            <bdi>{c.title}</bdi>
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {c.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-shrink-0">
                        <span>
                          {localeNumber(lang, c.durationHrs)} {lang === "fa" ? "ساعت" : "hours"}
                        </span>
                        {c.price > 0 && (
                          <span className="font-medium text-foreground/80">
                            {localePrice(lang, c.price)}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            </Reveal>
          ))}
        </div>
      </div>
    </PublicShell>
  );
}
