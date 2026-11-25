import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  localeDateTime,
  localeNumber,
  localePrice,
  tierLabel,
  regStatusLabel,
} from "@/lib/format";
import { getServerLang } from "@/lib/i18n";
import { localizedCourse } from "@/lib/content";
import { PublicShell } from "@/components/public-shell";
import { CourseSoftwareArtwork } from "@/components/course-software-svg";
import { CourseGuideDrawer } from "@/components/course-guide-drawer";
import { safeJsonLd } from "@/lib/security";
import {
  Clock,
  CheckCircle2,
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  MapPin,
  BookOpen,
  GraduationCap,
  Cpu,
  Download,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lang = await getServerLang();
  const fa = lang === "fa";

  const course = await db.course.findUnique({
    where: { slug },
    include: {
      sections: { orderBy: { order: "asc" } },
      sessions: { orderBy: [{ startAt: "asc" }, { order: "asc" }] },
      resources: {
        where: { isPublic: true },
        orderBy: { createdAt: "desc" },
        include: { file: { select: { url: true, filename: true } } },
      },
      _count: {
        select: {
          registrations: { where: { status: { not: "CANCELLED" } } },
        },
      },
    },
  });

  if (!course || !course.published) notFound();

  const remaining = Math.max(0, course.capacity - course._count.registrations);
  const isOpen = course.regStatus === "OPEN" && remaining > 0;
  const lc = localizedCourse(lang, course);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: lc.title,
    description: lc.description,
    provider: {
      "@type": "EducationalOrganization",
      name: fa ? "آکادمی معماری نیله" : "Neeleh Architecture Academy",
    },
  };

  return (
    <PublicShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      {/* Breadcrumb bar */}
      <div className="border-b border-border bg-secondary/20">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-3 flex items-center justify-between gap-4">
          <Link
            href="/courses"
            className="inline-flex min-h-[40px] items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="size-3.5 rtl:-scale-x-100" aria-hidden />
            <span>{fa ? "بازگشت به کاتالوگ دوره‌ها" : "Back to course catalog"}</span>
          </Link>
          <CourseGuideDrawer />
        </div>
      </div>

      {/* Hero split: Typography + Live Software Artwork */}
      <section className="relative overflow-hidden border-b border-border bg-secondary/15">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-12 sm:py-16">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8 lg:gap-12 items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-4">
                <span>{tierLabel(lang, course.tier)}</span>
                <span aria-hidden>·</span>
                <span>
                  <bdi>{lc.category}</bdi>
                </span>
                {lc.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-2">
                    <span aria-hidden>·</span>
                    <span>{tag.trim()}</span>
                  </span>
                ))}
              </div>

              <h1 className="text-3xl sm:text-5xl font-medium tracking-[-0.03em] leading-[1.08] text-balance">
                <bdi>{lc.title}</bdi>
              </h1>

              {lc.description && (
                <p className="mt-5 text-base sm:text-lg leading-relaxed text-muted-foreground max-w-2xl">
                  {lc.description}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-border bg-card p-5 aspect-[16/11] relative overflow-hidden">
              {course.bannerUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={course.bannerUrl}
                  alt={lc.title}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 size-full object-cover opacity-15"
                />
              ) : null}
              <div className="relative z-10 w-full h-full">
                <CourseSoftwareArtwork slugOrKey={course.slug} className="w-full h-full" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-12 sm:py-16">
        <div className="grid lg:grid-cols-[1fr_360px] gap-12">
          {/* Main column */}
          <div className="space-y-12 min-w-0">
            {lc.about && (
              <section>
                <h2 className="text-sm font-semibold text-foreground mb-4">
                  {fa ? "درباره دوره" : "About this course"}
                </h2>
                <div className="space-y-4">
                  {lc.about.split("\n").map((p, i) => (
                    <p key={i} className="text-base leading-relaxed text-foreground/85">
                      {p}
                    </p>
                  ))}
                </div>
              </section>
            )}

            {lc.outputs.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-foreground mb-4">
                  {fa ? "خروجی‌های عملی دوره" : "What you will build"}
                </h2>
                <ul className="grid sm:grid-cols-2 gap-3">
                  {lc.outputs.map((o, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 p-4 rounded-md border border-border bg-card"
                    >
                      <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden />
                      <span className="text-sm leading-relaxed">{o}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Syllabus */}
            {course.sections.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-foreground mb-4">
                  {fa ? "سرفصل‌های آموزشی" : "Course syllabus"}
                </h2>
                <ol className="space-y-3">
                  {course.sections.map((s, i) => {
                    const items = s.items ? s.items.split("\n").filter(Boolean) : [];
                    return (
                      <li
                        key={s.id}
                        className="rounded-md border border-border bg-card overflow-hidden"
                      >
                        <div className="flex items-center gap-3 p-4 border-b border-border bg-secondary/25">
                          <span className="grid size-7 place-items-center rounded-full bg-foreground text-background text-xs font-mono tabular-nums shrink-0">
                            {localeNumber(lang, i + 1)}
                          </span>
                          <h3 className="text-sm sm:text-base font-medium">{s.title}</h3>
                        </div>
                        {items.length > 0 && (
                          <ul className="p-4 space-y-2">
                            {items.map((it, j) => (
                              <li
                                key={j}
                                className="flex items-start gap-3 text-sm text-muted-foreground"
                              >
                                <span className="text-foreground/40 mt-0.5">—</span>
                                <span className="leading-relaxed">{it}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </section>
            )}

            {/* Upcoming Cohort Schedule */}
            {course.sessions.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-foreground mb-4">
                  {fa ? "زمان‌بندی نوبت‌ها و جلسات" : "Scheduled sessions & cohorts"}
                </h2>
                <div className="divide-y divide-border rounded-lg border border-border bg-card">
                  {course.sessions.map((sess) => (
                    <div
                      key={sess.id}
                      className="p-4 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-sm font-medium">{sess.title}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="tabular-nums">
                            {sess.startAt
                              ? localeDateTime(lang, sess.startAt)
                              : localeDateTime(lang, sess.date)}
                          </span>
                          {sess.locationOrPlatform && (
                            <>
                              <span aria-hidden>·</span>
                              <span>{sess.locationOrPlatform}</span>
                            </>
                          )}
                          <span aria-hidden>·</span>
                          <span>{sess.format}</span>
                        </div>
                      </div>
                      <a
                        href={`/api/calendar/${sess.id}/ics`}
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-colors whitespace-nowrap"
                      >
                        <Download className="size-3.5" aria-hidden />
                        <span>{fa ? "افزودن به تقویم (.ics)" : "Add to calendar (.ics)"}</span>
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Public starter resources */}
            {course.resources.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-foreground mb-4">
                  {fa ? "منابع عمومی و پیش‌نمایش" : "Public starter resources"}
                </h2>
                <ul className="grid sm:grid-cols-2 gap-3">
                  {course.resources.map((r) => {
                    const href = r.file?.url ?? r.url;
                    return (
                      <li key={r.id} className="rounded-md border border-border bg-card p-4">
                        <div className="text-sm font-medium mb-1">{r.title}</div>
                        {r.description && (
                          <p className="text-xs text-muted-foreground mb-3">{r.description}</p>
                        )}
                        {href && (
                          <a
                            href={href}
                            target={href.startsWith("http") ? "_blank" : undefined}
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium underline underline-offset-4"
                          >
                            <span>{fa ? "دریافت فایل" : "Download resource"}</span>
                            <ArrowUpRight className="size-3.5" />
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* Prerequisites & Tools */}
            {(lc.prereqs.length > 0 || course.tools || course.aiPolicy) && (
              <section className="space-y-4">
                {lc.prereqs.length > 0 && (
                  <div className="p-4 rounded-md border border-border bg-card">
                    <h2 className="text-xs font-semibold text-muted-foreground mb-2">
                      {fa ? "پیش‌نیازهای ورودی" : "Prerequisites"}
                    </h2>
                    <p className="text-sm leading-relaxed text-foreground/85">
                      {lc.prereqs.join(" · ")}
                    </p>
                  </div>
                )}
                {course.tools && (
                  <div className="p-4 rounded-md border border-border bg-card flex items-start gap-3">
                    <Cpu className="size-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden />
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground mb-1">
                        {fa ? "نرم‌افزارها و ابزارهای کلیدی" : "Software & Tooling"}
                      </div>
                      <div className="text-sm text-foreground">{course.tools}</div>
                    </div>
                  </div>
                )}
                {course.aiPolicy && (
                  <div className="p-4 rounded-md border border-border bg-card">
                    <div className="text-xs font-semibold text-muted-foreground mb-1">
                      {fa ? "رویکرد AI در این دوره" : "AI Policy"}
                    </div>
                    <div className="text-sm text-foreground/85">{course.aiPolicy}</div>
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Sticky Sidebar */}
          <aside className="lg:sticky lg:top-20 lg:self-start space-y-4">
            <div className="rounded-lg border border-border bg-card p-6 space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {fa ? "وضعیت ثبت‌نام" : "Enrollment"}
                </span>
                <span
                  className={`text-xs font-medium ${
                    isOpen ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {isOpen ? regStatusLabel(lang, "OPEN") : regStatusLabel(lang, "FULL")}
                </span>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  {fa ? "شهریه دوره" : "Tuition"}
                </div>
                <div className="text-2xl font-medium tabular-nums">
                  {course.price > 0 ? localePrice(lang, course.price) : fa ? "تماس بگیرید" : "Contact us"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    {fa ? "ظرفیت کل" : "Total capacity"}
                  </div>
                  <div className="text-lg font-medium tabular-nums">
                    {localeNumber(lang, course.capacity)} {fa ? "نفر" : "seats"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    {fa ? "باقیمانده" : "Remaining"}
                  </div>
                  <div className="text-lg font-medium tabular-nums text-emerald-700">
                    {localeNumber(lang, remaining)} {fa ? "نفر" : "seats"}
                  </div>
                </div>
              </div>

              {course.durationHrs > 0 && (
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground pt-4 border-t border-border">
                  <Clock className="size-4" aria-hidden />
                  <span className="tabular-nums">
                    {fa
                      ? `مدت دوره: ${localeNumber(lang, course.durationHrs)} ساعت`
                      : `Duration: ${localeNumber(lang, course.durationHrs)} hours`}
                  </span>
                </div>
              )}

              {isOpen ? (
                <Link
                  href={`/register/${course.slug}`}
                  className="flex min-h-[48px] items-center justify-center gap-2 bg-foreground text-background rounded-md px-6 text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
                >
                  <span>{fa ? "ثبت‌نام و رزرو صندلی" : "Register & reserve seat"}</span>
                  <ArrowUpRight className="size-4 rtl:-scale-x-100" />
                </Link>
              ) : (
                <div className="text-center text-xs text-muted-foreground p-4 border border-dashed border-border rounded-md">
                  {fa ? "ظرفیت این نوبت تکمیل شده است." : "This cohort is currently full."}
                  <br />
                  <Link href="/contact" className="underline underline-offset-4 text-foreground mt-2 inline-block">
                    {fa ? "رزرو لیست انتظار / مشاوره" : "Join waitlist / inquire"}
                  </Link>
                </div>
              )}

              <p className="text-xs leading-relaxed text-muted-foreground text-center">
                {fa
                  ? "پرداخت نهایی پس از بررسی و هماهنگی کارشناسان آموزش انجام می‌شود."
                  : "Tuition settlement is finalized after advisor confirmation."}
              </p>
            </div>

            {/* Logistics card */}
            <div className="rounded-lg border border-border bg-card p-6 space-y-3 text-sm">
              <div className="text-xs font-semibold text-muted-foreground mb-2">
                {fa ? "جزئیات برگزاری" : "Logistics"}
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="size-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden />
                <div>
                  <div>{fa ? "حضوری — محل برگزاری دامغان / آنلاین" : "In person — Damghan / Live Online"}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{fa ? "دامغان و سراسر کشور" : "Damghan & Nationwide Online"}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="size-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden />
                <div>
                  <div>{fa ? "شنبه تا چهارشنبه" : "Saturday to Wednesday"}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {fa ? "ساعات ۹ تا ۱۸" : "09:00 to 18:00"}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <BookOpen className="size-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden />
                <div>
                  {fa ? "دسته:" : "Category:"} <bdi>{lc.category}</bdi>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <GraduationCap className="size-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden />
                <div>
                  {fa ? "سطح:" : "Tier:"} <bdi>{tierLabel(lang, course.tier)}</bdi>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </PublicShell>
  );
}
