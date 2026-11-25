import Link from "next/link";
import { db } from "@/lib/db";
import { getServerLang } from "@/lib/i18n";
import { localizedCourse } from "@/lib/content";
import { resourceKindLabel } from "@/lib/format";
import { PublicShell } from "@/components/public-shell";
import { ArrowUpRight, Download, FolderOpen, Lock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  const lang = await getServerLang();
  const fa = lang === "fa";

  const [publicResources, courses] = await Promise.all([
    db.courseResource.findMany({
      where: { isPublic: true, course: { published: true } },
      orderBy: { createdAt: "desc" },
      include: {
        course: { select: { slug: true, title: true, titleEn: true } },
        file: { select: { url: true, filename: true } },
      },
    }),
    db.course.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, title: true, titleEn: true, tools: true },
    }),
  ]);

  return (
    <PublicShell>
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-12 sm:py-16">
        <div className="mb-10 sm:mb-14">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <FolderOpen className="size-3.5" aria-hidden />
            <span>{fa ? "منابع آموزشی و فایل‌های پایه" : "Public Starter Resources"}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-medium tracking-[-0.03em] leading-tight">
            {fa ? "منابع عمومی و جزوات استودیو" : "Starter Packs & Public References"}
          </h1>
          <p className="mt-4 text-base text-muted-foreground max-w-2xl leading-relaxed">
            {fa
              ? "فایل‌های عمومی پیش‌نمایش در این صفحه قابل دریافت هستند. تمرین‌ها و پکیج‌های پروژه کامل هر دوره، پس از تایید ثبت‌نام در پنل هنرجویی در دسترس قرار می‌گیرند."
              : "Public starter files and guides are listed here. Full exercise datasets and studio hand-outs unlock inside the Student Portal once enrollment is confirmed."}
          </p>
        </div>

        {/* Public Starter Files */}
        <section className="mb-14">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            {fa ? "فایل‌های عمومی قابل دانلود" : "Public downloads"}
          </h2>

          {publicResources.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center space-y-3">
              <Lock className="size-6 mx-auto text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                {fa
                  ? "در حال حاضر فایل عمومی روی سرور علامت‌گذاری نشده است. فایل‌های تخصصی هر دوره برای هنرجویان تاییدشده از طریق پنل کاربری قابل دسترسی است."
                  : "No public starter packs have been marked public yet. Course datasets are unlocked directly for confirmed learners inside the Student Portal."}
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <Link
                  href="/panel/"
                  className="inline-flex min-h-[42px] items-center rounded-md bg-foreground px-4 text-xs font-medium text-background hover:opacity-90 transition-opacity"
                >
                  {fa ? "ورود به پنل هنرجو" : "Open Student Portal"}
                </Link>
                <Link
                  href="/courses"
                  className="inline-flex min-h-[42px] items-center rounded-md border border-border px-4 text-xs font-medium hover:bg-secondary transition-colors"
                >
                  {fa ? "کاتالوگ دوره‌ها" : "Browse courses"}
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {publicResources.map((r) => {
                const href = r.file?.url ?? r.url;
                const courseName = fa ? r.course.title : (r.course.titleEn || r.course.title);
                return (
                  <div key={r.id} className="rounded-lg border border-border bg-card p-5 flex flex-col justify-between gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        {resourceKindLabel(lang, r.kind)} · {courseName}
                      </div>
                      <h3 className="text-base font-medium mb-2">{r.title}</h3>
                      {r.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{r.description}</p>
                      )}
                      {r.softwareVersion && (
                        <p className="mt-2 text-xs text-muted-foreground font-mono">{r.softwareVersion}</p>
                      )}
                    </div>
                    {href && (
                      <a
                        href={href}
                        target={href.startsWith("http") ? "_blank" : undefined}
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-md border border-border px-4 py-2 text-xs font-medium hover:bg-secondary transition-colors"
                      >
                        <Download className="size-3.5" aria-hidden />
                        <span>{fa ? "دریافت فایل" : "Download file"}</span>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Course Guides Overview */}
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-4">
            {fa ? "نرم‌افزارها و پیش‌نیازهای دوره‌ها" : "Software & Tooling per Course"}
          </h2>
          <div className="divide-y divide-border rounded-lg border border-border bg-card">
            {courses.map((c) => {
              const lc = localizedCourse(lang, {
                ...c,
                description: null,
                descriptionEn: null,
                category: "",
                categoryEn: null,
                about: null,
                aboutEn: null,
                tags: null,
                tagsEn: null,
                outputs: null,
                outputsEn: null,
                prereqs: null,
                prereqsEn: null,
              });
              return (
                <div key={c.slug} className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">
                      <bdi>{lc.title}</bdi>
                    </div>
                    {c.tools && <div className="text-xs text-muted-foreground mt-0.5">{c.tools}</div>}
                  </div>
                  <Link
                    href={`/courses/${c.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-medium hover:underline underline-offset-4 whitespace-nowrap"
                  >
                    <span>{fa ? "مشاهده سرفصل" : "View syllabus"}</span>
                    <ArrowUpRight className="size-3.5 rtl:-scale-x-100" />
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
