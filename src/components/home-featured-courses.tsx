import Link from "next/link";
import { db } from "@/lib/db";
import { localeNumber, localePrice, tierLabel } from "@/lib/format";
import { getServerLang } from "@/lib/i18n";
import { localizedCourse } from "@/lib/content";
import { CourseSoftwareArtwork } from "@/components/course-software-svg";
import { BlockReveal } from "@/components/block-reveal";
import { ArrowUpRight, Clock, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export async function FeaturedCoursesSection() {
  const lang = await getServerLang();
  const fa = lang === "fa";

  let courses;
  try {
    courses = await db.course.findMany({
      where: { featured: true, published: true },
      orderBy: { sortOrder: "asc" },
      take: 3,
      include: {
        _count: {
          select: {
            registrations: { where: { status: { not: "CANCELLED" } } },
          },
        },
      },
    });
  } catch {
    return null;
  }

  if (courses.length === 0) return null;

  return (
    <section className="border-t border-border bg-secondary/20">
      <div className="mx-auto max-w-[1800px] px-5 sm:px-8 lg:px-12 py-16 sm:py-24">
        <BlockReveal className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <span className="font-mono tabular-nums">{fa ? "۰۴" : "04"}</span>
              <span aria-hidden>·</span>
              <span>{fa ? "دوره‌های برگزیده" : "Featured tracks"}</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-medium tracking-[-0.03em]">
              {fa ? "مسیرهای پیشنهادی شروع" : "Recommended starting points"}
            </h2>
          </div>
          <Link
            href="/courses"
            className="group flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            <span>{fa ? "همه ۹ دوره" : "All 9 courses"}</span>
            <ArrowUpRight className="size-4 rtl:-scale-x-100 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
          </Link>
        </BlockReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((c, idx) => {
            const lc = localizedCourse(lang, c);
            const remaining = Math.max(0, c.capacity - c._count.registrations);
            return (
              <BlockReveal key={c.id} delay={idx * 0.08}>
                <Link
                  href={`/courses/${c.slug}`}
                  className="group flex h-full flex-col rounded-lg border border-border bg-card overflow-hidden hover:border-foreground/35 transition-colors"
                >
                <div className="h-44 relative border-b border-border bg-secondary/25 overflow-hidden">
                  {c.bannerUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.bannerUrl}
                      alt={lc.title}
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 size-full object-cover opacity-20 group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : null}
                  <div className="relative z-10 h-full w-full p-4">
                    <CourseSoftwareArtwork slugOrKey={c.slug} className="w-full h-full" />
                  </div>
                </div>

                <div className="flex-1 p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <span>{tierLabel(lang, c.tier)}</span>
                      <span aria-hidden>·</span>
                      <span>
                        <bdi>{lc.category}</bdi>
                      </span>
                    </div>
                    <h3 className="text-lg font-medium leading-snug mb-2 group-hover:text-foreground transition-colors line-clamp-2">
                      <bdi>{lc.title}</bdi>
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-4">
                      {lc.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border text-xs text-muted-foreground">
                    <div className="flex items-center gap-3 tabular-nums">
                      {c.durationHrs > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="size-3.5" aria-hidden />
                          {localeNumber(lang, c.durationHrs)} {fa ? "ساعت" : "hrs"}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="size-3.5" aria-hidden />
                        {localeNumber(lang, remaining)} {fa ? "صندلی" : "seats"}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-foreground tabular-nums">
                      {c.price > 0 ? localePrice(lang, c.price) : fa ? "تماس" : "Contact"}
                    </span>
                  </div>
                </div>
                </Link>
              </BlockReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
