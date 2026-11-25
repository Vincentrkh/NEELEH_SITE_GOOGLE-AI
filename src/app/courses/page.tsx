import { db } from "@/lib/db";
import { getServerLang } from "@/lib/i18n";
import { localizedCourse } from "@/lib/content";
import { getSkin } from "@/lib/skin";
import { TmPortfolio } from "@/components/tm/tm-portfolio";
import { PublicShell } from "@/components/public-shell";
import {
  CoursesCatalogClient,
  type CatalogCourseItem,
} from "@/components/courses-catalog-client";

export const dynamic = "force-dynamic";

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string }>;
}) {
  const lang = await getServerLang();
  const fa = lang === "fa";
  const sp = await searchParams;
  const tierFilter = sp.tier;

  const courses = await db.course.findMany({
    where: { published: true },
    orderBy: [{ tier: "asc" }, { sortOrder: "asc" }],
    include: {
      _count: {
        select: {
          registrations: { where: { status: { not: "CANCELLED" } } },
        },
      },
    },
  });

  const skin = await getSkin();
  if (skin === "tresmares") {
    const filtered =
      tierFilter && ["BEGINNER", "INTERMEDIATE", "PRO"].includes(tierFilter)
        ? courses.filter((c) => c.tier === tierFilter)
        : courses;
    return (
      <TmPortfolio
        courses={filtered.map((c) => {
          const lc = localizedCourse(lang, c);
          return {
            id: c.id,
            slug: c.slug,
            title: lc.title,
            tier: c.tier,
            category: lc.category,
            description: lc.description,
            durationHrs: c.durationHrs,
            price: c.price,
          };
        })}
        initialTier={tierFilter}
      />
    );
  }

  const catalogItems: CatalogCourseItem[] = courses.map((c) => {
    const lc = localizedCourse(lang, c);
    return {
      id: c.id,
      slug: c.slug,
      tier: c.tier,
      title: lc.title,
      description: lc.description,
      category: lc.category,
      tags: lc.tags,
      tools: c.tools,
      durationHrs: c.durationHrs,
      capacity: c.capacity,
      takenCount: c._count.registrations,
      price: c.price,
      regStatus: c.regStatus,
      bannerUrl: c.bannerUrl,
    };
  });

  return (
    <PublicShell>
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-12 sm:py-16">
        <div className="mb-10 sm:mb-14">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <span className="font-mono tabular-nums">{fa ? "۰۱" : "01"}</span>
            <span aria-hidden>·</span>
            <span>{fa ? "کاتالوگ دوره‌های تخصصی" : "Academy Catalog"}</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-medium tracking-[-0.03em] leading-[1.05] text-balance">
            {fa ? "نُه دوره تخصصی در سه لایه" : "Nine courses across three tiers"}
          </h1>
          <p className="mt-5 text-base sm:text-lg leading-relaxed text-muted-foreground max-w-2xl">
            {fa
              ? "از نقشه‌کشی فاز ۲ و مدلسازی BIM برای ورود به بازار کار، تا طراحی محاسباتی با گرس‌هاپر و معماری مبتنی بر هوش مصنوعی."
              : "From Phase-2 construction drafting and Revit BIM workflows to computational Grasshopper geometry and AI-augmented studio pipelines."}
          </p>
        </div>

        <CoursesCatalogClient
          courses={catalogItems}
          lang={lang}
          initialTier={tierFilter}
        />
      </div>
    </PublicShell>
  );
}
