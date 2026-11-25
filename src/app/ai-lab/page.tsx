import Link from "next/link";
import { db } from "@/lib/db";
import { getServerLang } from "@/lib/i18n";
import { localizedCourse } from "@/lib/content";
import { tierLabel } from "@/lib/format";
import { getIntegrationStatuses } from "@/lib/ai/gateway";
import { PublicShell } from "@/components/public-shell";
import { CourseSoftwareArtwork } from "@/components/course-software-svg";
import { CourseGuideDrawer } from "@/components/course-guide-drawer";
import { ArrowUpRight, Cpu, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AiLabPage() {
  const lang = await getServerLang();
  const fa = lang === "fa";

  const courses = await db.course.findMany({
    where: { published: true },
    orderBy: [{ tier: "desc" }, { sortOrder: "asc" }],
  });

  const integrations = getIntegrationStatuses();
  const geminiStatus = integrations.find((i) => i.id === "gemini");

  return (
    <PublicShell>
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-12 sm:py-16">
        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8 items-end mb-12 sm:mb-16 pb-10 border-b border-border">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <Cpu className="size-3.5" aria-hidden />
              <span>{fa ? "آزمایشگاه طراحی محاسباتی و AI" : "Computational Design & AI Lab"}</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-medium tracking-[-0.03em] leading-[1.08] text-balance">
              {fa
                ? "معماری در عصر هوش مصنوعی، گرس‌هاپر و اتوماسیون"
                : "Architecture in the Era of AI, Parametric Systems & Automation"}
            </h1>
            <p className="mt-4 text-base text-muted-foreground max-w-2xl leading-relaxed">
              {fa
                ? "ترکیب مهندسی دقیق نقشه‌های اجرایی و BIM با الگوریتم‌های گرس‌هاپر، اسکریپت‌نویسی دفاتر معماری و ابزارهای هوشمند برای تسریع ایده‌پردازی و ساخت‌پذیری."
                : "Bridging disciplined BIM documentation with Grasshopper algorithms, office automation scripts, and responsible AI advising grounded in our live catalog."}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <CourseGuideDrawer
                triggerLabel={fa ? "گفتگو با راهنمای هوشمند انتخاب دوره" : "Ask AI Course Path Advisor"}
                triggerClassName="inline-flex min-h-[46px] items-center gap-2 rounded-md bg-foreground px-5 py-2.5 text-xs font-medium text-background hover:opacity-90 transition-opacity whitespace-nowrap"
              />
              <Link
                href="/courses?tier=PRO"
                className="inline-flex min-h-[46px] items-center gap-1.5 rounded-md border border-border px-4 py-2.5 text-xs font-medium hover:bg-secondary transition-colors whitespace-nowrap"
              >
                <span>{fa ? "دوره‌های لایه پیشرفته" : "View Tier 3 courses"}</span>
                <ArrowUpRight className="size-3.5 rtl:-scale-x-100" />
              </Link>
            </div>
          </div>

          {/* Honest AI Gateway Status Card */}
          <div className="rounded-lg border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                <ShieldCheck className="size-4 text-muted-foreground" aria-hidden />
                {fa ? "وضعیت درگاه هوش مصنوعی (سرور)" : "Server AI Gateway Readiness"}
              </span>
              <span
                className={`text-xs font-medium ${
                  geminiStatus?.configured ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                {fa ? geminiStatus?.statusFa : geminiStatus?.statusEn}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {fa
                ? "تمامی درخواست‌های راهنمای هوشمند با تایید صریح کاربر، از طریق مسیر امن سمت سرور به مدل Gemini ارسال شده و صرفاً به کاتالوگ واقعی دوره‌های نیله استناد می‌کنند."
                : "Requests require explicit user consent, route strictly through server-side Gemini endpoints, and ground every answer in verified Neeleh catalog records."}
            </p>
          </div>
        </div>

        {/* Visual Showcase of All 9 Interactive Software Line-Art Systems */}
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-6">
            {fa ? "نقشه تعاملی نرم‌افزارها و اکوسیستم دوره‌ها" : "Interactive Tooling Stack Across All 9 Courses"}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map((c) => {
              const lc = localizedCourse(lang, c);
              return (
                <div
                  key={c.id}
                  className="rounded-lg border border-border bg-card overflow-hidden flex flex-col justify-between"
                >
                  <div className="h-44 border-b border-border bg-secondary/20 p-4">
                    <CourseSoftwareArtwork slugOrKey={c.slug} className="w-full h-full" />
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        {tierLabel(lang, c.tier)} · <bdi>{lc.category}</bdi>
                      </div>
                      <h3 className="text-base font-medium leading-snug mb-2">
                        <bdi>{lc.title}</bdi>
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{lc.description}</p>
                    </div>
                    <Link
                      href={`/courses/${c.slug}`}
                      className="inline-flex items-center gap-1 text-xs font-medium hover:underline underline-offset-4 whitespace-nowrap"
                    >
                      <span>{fa ? "جزئیات سرفصل" : "Explore course"}</span>
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
