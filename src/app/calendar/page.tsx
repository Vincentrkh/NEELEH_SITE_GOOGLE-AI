import Link from "next/link";
import { db } from "@/lib/db";
import { getServerLang } from "@/lib/i18n";
import { localizedCourse } from "@/lib/content";
import { localeDateTime, localeNumber, tierLabel } from "@/lib/format";
import { PublicShell } from "@/components/public-shell";
import { ArrowUpRight, CalendarDays, Download, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const lang = await getServerLang();
  const fa = lang === "fa";

  const [sessions, courses] = await Promise.all([
    db.courseSession.findMany({
      where: { course: { published: true } },
      orderBy: [{ startAt: "asc" }, { date: "asc" }],
      include: {
        course: {
          include: {
            _count: { select: { registrations: { where: { status: { not: "CANCELLED" } } } } },
          },
        },
        _count: { select: { registrations: { where: { status: { not: "CANCELLED" } } } } },
      },
    }),
    db.course.findMany({
      where: { published: true, regStatus: "OPEN" },
      orderBy: [{ tier: "asc" }, { sortOrder: "asc" }],
      include: {
        _count: { select: { registrations: { where: { status: { not: "CANCELLED" } } } } },
      },
    }),
  ]);

  return (
    <PublicShell>
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-12 sm:py-16">
        <div className="mb-10 sm:mb-14">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <CalendarDays className="size-3.5" aria-hidden />
            <span>{fa ? "تقویم آموزشی و نوبت‌های برگزاری" : "Cohort & Session Schedule"}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-medium tracking-[-0.03em] leading-tight">
            {fa ? "تقویم کلاس‌ها و کارگاه‌های آکادمی نیله" : "Upcoming Studio Sessions & Cohorts"}
          </h1>
          <p className="mt-4 text-base text-muted-foreground max-w-2xl leading-relaxed">
            {fa
              ? "برنامه زمان‌بندی جلسات ثبت‌شده را ببینید، با فایل .ics به تقویم شخصی اضافه کنید یا مستقیم صندلی رزرو کنید."
              : "Browse live scheduled sessions, add any session to your personal calendar via .ics export, or reserve a seat."}
          </p>
        </div>

        {/* Scheduled CourseSessions */}
        <section className="mb-14">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            {fa ? "جلسات زمان‌بندی‌شده" : "Scheduled sessions"}
          </h2>
          {sessions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              {fa
                ? "هنوز تاریخ مشخصی ثبت نشده است؛ از بخش ثبت‌نام باز دوره‌ها اقدام کنید."
                : "No fixed dates posted yet — view active open cohorts below."}
            </div>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border bg-card">
              {sessions.map((s) => {
                const lc = localizedCourse(lang, s.course);
                const cap = s.capacity ?? s.course.capacity;
                const taken = s._count.registrations || s.course._count.registrations;
                const remaining = Math.max(0, cap - taken);
                return (
                  <div
                    key={s.id}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{tierLabel(lang, s.course.tier)}</span>
                        <span aria-hidden>·</span>
                        <span>{s.format}</span>
                        <span aria-hidden>·</span>
                        <span className="tabular-nums">
                          {localeNumber(lang, remaining)} {fa ? "صندلی خالی" : "seats left"}
                        </span>
                      </div>
                      <h3 className="text-base font-medium">
                        <Link href={`/courses/${s.course.slug}`} className="hover:underline underline-offset-4">
                          <bdi>{lc.title}</bdi>
                        </Link>
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>{s.title}</span>
                        <span aria-hidden>·</span>
                        <span className="tabular-nums">{localeDateTime(lang, s.startAt ?? s.date)}</span>
                        {s.locationOrPlatform && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3" aria-hidden />
                            {s.locationOrPlatform}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <a
                        href={`/api/calendar/${s.id}/ics`}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-xs font-medium hover:bg-secondary transition-colors whitespace-nowrap"
                      >
                        <Download className="size-3.5" aria-hidden />
                        <span>{fa ? "خروجی تقویم (.ics)" : "Export .ics"}</span>
                      </a>
                      <Link
                        href={`/register/${s.course.slug}`}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-xs font-medium text-background hover:opacity-90 transition-opacity whitespace-nowrap"
                      >
                        <span>{fa ? "رزرو صندلی" : "Reserve seat"}</span>
                        <ArrowUpRight className="size-3.5 rtl:-scale-x-100" aria-hidden />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Open Enrollment Courses */}
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-4">
            {fa ? "دوره‌های دارای ثبت‌نام باز" : "Currently enrolling courses"}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((c) => {
              const lc = localizedCourse(lang, c);
              const remaining = Math.max(0, c.capacity - c._count.registrations);
              return (
                <div key={c.id} className="rounded-lg border border-border bg-card p-5 flex flex-col justify-between gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1.5">
                      {tierLabel(lang, c.tier)} · {localeNumber(lang, remaining)} {fa ? "صندلی" : "seats left"}
                    </div>
                    <h3 className="text-base font-medium leading-snug mb-2">
                      <Link href={`/courses/${c.slug}`} className="hover:underline underline-offset-4">
                        <bdi>{lc.title}</bdi>
                      </Link>
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{lc.description}</p>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border text-xs">
                    <span className="text-muted-foreground tabular-nums">
                      {localeNumber(lang, c.durationHrs)} {fa ? "ساعت" : "hrs"}
                    </span>
                    <Link
                      href={`/register/${c.slug}`}
                      className="inline-flex items-center gap-1 font-medium text-foreground hover:underline underline-offset-4 whitespace-nowrap"
                    >
                      <span>{fa ? "ثبت‌نام" : "Register"}</span>
                      <ArrowUpRight className="size-3.5 rtl:-scale-x-100" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
