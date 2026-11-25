import Link from "next/link";
import { db } from "@/lib/db";
import { getSiteSettings } from "@/lib/settings";
import { LeadForm } from "@/components/lead-form";
import { localeNumber } from "@/lib/format";
import { getServerLang } from "@/lib/i18n";
import { BlockReveal } from "@/components/block-reveal";
import { CalendarDays } from "lucide-react";

export const dynamic = "force-dynamic";

export async function ConsultationSection() {
  const lang = await getServerLang();
  const fa = lang === "fa";
  const settings = await getSiteSettings();
  let leadsCount = 0;
  try {
    leadsCount = await db.lead.count();
  } catch {
    // Fallback gracefully
  }

  const benefits = fa
    ? [
        "بررسی سوابق تحصیلی، پروژه‌ها و نرم‌افزارهای فعلی شما",
        "پیشنهاد دقیق لایه و نقشه راه یادگیری از فاز ۲ تا BIM و AI",
        "اطلاع از ظرفیت واقعی، سرفصل‌ها و تقویم نوبت‌های پیش‌رو",
      ]
    : [
        "Review of your academic background, portfolio, and current tools",
        "Tailored roadmap from Phase-2 drafting through BIM and AI workflows",
        "Direct cohort dates, real seat counts, and syllabus guidance",
      ];

  return (
    <section id="consult" className="border-t border-border bg-background scroll-mt-20">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-16 sm:py-24">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-16 items-start">
          <BlockReveal>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <span className="font-mono tabular-nums">{fa ? "۰۵" : "05"}</span>
              <span aria-hidden>·</span>
              <span>{fa ? "مشاوره تخصصی رایگان" : "Free academic advising"}</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-medium tracking-[-0.03em] leading-[1.1] mb-5 text-balance">
              {fa ? "مسیر خود را با هم بچینیم" : "Plan your studio path together"}
            </h2>

            <p className="text-base leading-relaxed text-muted-foreground max-w-md mb-8">
              {fa
                ? "مطمئن نیستید از کجا شروع کنید؟ فرم زیر را پر کنید تا بر اساس رشته و هدف شغلی‌تان، مناسب‌ترین دوره و نوبت را پیشنهاد دهیم."
                : "Not sure which tier matches your studio goals? Leave your background and we will recommend the exact track and upcoming cohort."}
            </p>

            <ul className="space-y-3 text-sm text-muted-foreground mb-8">
              {benefits.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="mt-2 size-1.5 rounded-full bg-foreground shrink-0" aria-hidden />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>

            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-border mb-6">
              <div>
                <div className="text-2xl sm:text-3xl font-medium tabular-nums">
                  {localeNumber(lang, 300 + leadsCount)}+
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {fa ? "نفر از مشاوره استفاده کرده‌اند" : "learners advised"}
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-medium tabular-nums">
                  {localeNumber(lang, settings["stats.years"])}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {fa ? "سال تجربه حرفه‌ای و اجرایی" : "years of practice"}
                </div>
              </div>
            </div>

            <Link
              href="/calendar"
              className="inline-flex min-h-[42px] items-center gap-2 rounded-md border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary/60 transition-colors whitespace-nowrap"
            >
              <CalendarDays className="size-4" aria-hidden />
              <span>{fa ? "مشاهده تقویم کلاس‌های پیش‌رو" : "View upcoming cohort calendar"}</span>
            </Link>
          </BlockReveal>

          <BlockReveal delay={0.1}>
            <LeadForm />
          </BlockReveal>
        </div>
      </div>
    </section>
  );
}
