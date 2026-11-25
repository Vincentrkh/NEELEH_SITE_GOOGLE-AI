import Link from "next/link";
import { getSkin } from "@/lib/skin";
import { getServerLang } from "@/lib/i18n";
import { TmAbout } from "@/components/tm/tm-about";
import { BrandLogoGraphic } from "@/components/brand-logo";

export const dynamic = "force-dynamic";

export default async function WhyNeelehPage() {
  const skin = await getSkin();
  const lang = await getServerLang();

  // ── پوسته دوم: Tres Mares — قالب «درباره» کامل (تایم‌لاین + ارزش‌ها) ──
  if (skin === "tresmares") {
    return <TmAbout />;
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
            <span className="text-sm font-medium">{lang === "fa" ? "آکادمی نیله" : "Neeleh Academy"}</span>
          </Link>
          <Link href="/courses" className="text-xs uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors">
            {lang === "fa" ? "دوره‌ها" : "Courses"}
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[900px] px-5 sm:px-8 lg:px-12 py-12 sm:py-20">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">[{lang === "fa" ? " چرا نیله " : " Why Neeleh "}]</p>
        <h1 className="text-4xl sm:text-6xl font-medium tracking-[-0.04em] leading-[0.95] mb-8">
          {lang === "fa" ? "آموزشی که" : "Education that"}
          <br />
          {lang === "fa" ? "از ابزار شروع می‌شود،" : "starts with tools,"}
          <br />
          {lang === "fa" ? "در روش تمام می‌شود." : "and ends with method."}
        </h1>

        <div className="prose prose-sm sm:prose-base max-w-none space-y-8 text-foreground/80 leading-relaxed">
          <section>
            <h2 className="text-xl font-medium mb-3">{lang === "fa" ? "سه لایه، نه فقط ویدیوی بی‌ته‌وتو" : "Three layers, not just loose videos"}</h2>
            <p>{lang === "fa"
              ? "هر دوره‌ی نیله سه لایه دارد و هیچ دوره‌ای بدون هر سه لایه منتشر نمی‌شود:"
              : "Every Neeleh course has three layers — no course is published without all three:"}</p>
            <ul className="space-y-2 mt-3">
              <li><strong>{lang === "fa" ? "لایه‌ی مهارت پایه:" : "Foundation skills layer:"}</strong> {lang === "fa"
                ? "ابزار و دستورات، با تمرین‌های کوچک و واقعی"
                : "tools and commands, with small, real exercises"}</li>
              <li><strong>{lang === "fa" ? "لایه‌ی گردش کار حرفه‌ای:" : "Professional workflow layer:"}</strong> {lang === "fa"
                ? "چطور همان ابزار در پروژه‌ی واقعی و با استاندارد دفتر استفاده می‌شود"
                : "how the same tool is used on a real project, to office standards"}</li>
              <li><strong>{lang === "fa" ? "لایه‌ی پروژه‌ی نهایی:" : "Final project layer:"}</strong> {lang === "fa"
                ? "خروجی‌ای که می‌توانید در رزومه و مصاحبه نشان بدهید"
                : "an output you can show in your résumé and interviews"}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3">{lang === "fa" ? "مدرسین با تجربه‌ی واقعی" : "Instructors with real experience"}</h2>
            <p>{lang === "fa"
              ? "مدرسین نیله فقط معلم نیستند — آن‌ها در دفاتر معماری کار می‌کنند یا کار کرده‌اند. آنها می‌دانند کدام بخش از هر نرم‌افزار در پروژه‌ی واقعی مهم است و کدام صرفاً تئوری."
              : "Neeleh instructors aren't just teachers — they work, or have worked, at architecture offices. They know which parts of each tool actually matter on real projects and which are pure theory."}</p>
            <p className="mt-2"><Link href="/instructors" className="underline underline-offset-4 hover:opacity-70 transition-opacity">{lang === "fa" ? "آشنایی با مدرسین ←" : "Meet the instructors ←"}</Link></p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3">{lang === "fa" ? "۹ دوره، ۳ مسیر شغلی" : "9 courses, 3 career paths"}</h2>
            <p>{lang === "fa"
              ? "ما ۹ دوره داریم نه ۵۰ دوره‌ی پراکنده. هر دوره برای یک هدف شغلی خاص طراحی شده و هر سه مسیر (ورود به بازار کار، توسعه‌ی مهارت، تخصص پیشرفته) خروجی روشنی دارد."
              : "We offer 9 courses, not 50 scattered ones. Each course is designed for a specific career goal, and all three paths (job entry, skill development, advanced specialization) lead to a clear outcome."}</p>
            <p className="mt-2"><Link href="/paths" className="underline underline-offset-4 hover:opacity-70 transition-opacity">{lang === "fa" ? "مشاهده‌ی مسیرهای یادگیری ←" : "View learning paths ←"}</Link></p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3">{lang === "fa" ? "تجربه‌های گردآمده از ۱۳۷۹ تا امروز، نه فقط تئوری" : "Experiences unified since 2000, not just theory"}</h2>
            <p>{lang === "fa"
              ? "آکادمی نیله حاصل گردهمایی تجربه‌های متنوع طراحی و اجرا از سال ۱۳۷۹ تا امروز است. اکثر دوره‌ها از چالش‌های واقعی پروژه‌ها استخراج شده‌اند — از نقشه‌کشی فاز ۲ و مدل‌سازی BIM تا اتوماسیون و هوش مصنوعی."
              : "Neeleh Academy brings together diverse architectural and construction practice accumulated since 2000. Courses are drawn directly from real project challenges — from Phase-2 drafting and BIM coordination to AI workflows."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3">{lang === "fa" ? "پشتیبانی بعد از دوره" : "Support after the course"}</h2>
            <p>{lang === "fa" ? "پس از تکمیل دوره، دسترسی به:" : "After completing a course you keep access to:"}</p>
            <ul className="space-y-2 mt-3">
              <li>{lang === "fa" ? "ضبط تمام جلسات برای مرور بعدی" : "Recordings of all sessions for later review"}</li>
              <li>{lang === "fa" ? "فایل‌های تمرین و قالب‌های آماده" : "Exercise files and ready-made templates"}</li>
              <li>{lang === "fa" ? "پنل هنرجویی برای پرسش سوال از مدرس" : "A student panel for asking the instructor questions"}</li>
              <li>{lang === "fa" ? "گواهی پایان دوره پس از تحویل پروژه‌ی نهایی" : "A completion certificate after submitting the final project"}</li>
            </ul>
          </section>

          <section className="pt-8 border-t border-border">
            <h2 className="text-xl font-medium mb-4">{lang === "fa" ? "آماده‌ی شروع هستید؟" : "Ready to start?"}</h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/paths" className="inline-flex items-center gap-2 min-h-[44px] bg-foreground text-background px-5 rounded-md text-sm font-medium hover:opacity-90 transition-opacity">
                {lang === "fa" ? "انتخاب مسیر یادگیری" : "Choose a learning path"}
              </Link>
              <Link href="/courses" className="inline-flex items-center gap-2 min-h-[44px] border border-border px-5 rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors">
                {lang === "fa" ? "مشاهده‌ی همه دوره‌ها" : "Browse all courses"}
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
