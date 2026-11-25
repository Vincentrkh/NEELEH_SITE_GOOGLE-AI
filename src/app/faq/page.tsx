import { StaticCmsPage } from "@/components/static-cms-page";
import { getServerLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function FaqPage() {
  const lang = await getServerLang();
  const fa = lang === "fa";

  return (
    <StaticCmsPage
      slug="faq"
      fallbackTitleFa="سوالات متداول هنرجویان"
      fallbackTitleEn="Frequently Asked Questions"
      fallbackBodyFa={[
        "## آیا برای شروع دوره‌های لایه ۱ نیاز به پیش‌زمینه نرم‌افزاری است؟",
        "خیر. دوره‌های لایه ۱ (اتوکد فاز ۲، اسکچاپ و رویت مقدماتی) از مبانی اصولی شروع می‌شوند و به سطح پروژه‌ای می‌رسند.",
        "## ثبت‌نام و پرداخت شهریه چگونه انجام می‌شود؟",
        "پس از پر کردن فرم ثبت‌نام دوره و دریافت کد رهگیری، کارشناسان آموزش ظرفیت نوبت انتخاب‌شده را تایید و هماهنگی مالی را انجام می‌دهند.",
        "## کلاس‌ها به‌صورت حضوری است یا آنلاین؟",
        "کلاس‌های حضوری در دامغان برگزار می‌شود و برای شرکت‌کنندگان سراسر کشور نیز دوره‌های زنده آنلاین و هیبرید برنامه‌ریزی می‌شود.",
        "## چگونه می‌توانم دوره مناسب سطح خود را پیدا کنم؟",
        "می‌توانید از فرم مشاوره رایگان یا بخش راهنمای هوشمند انتخاب دوره استفاده کنید تا بر اساس پیش‌زمینه شما مسیر پیشنهادی ارائه شود.",
      ]}
      fallbackBodyEn={[
        "## Do Tier 1 foundation courses require prior software experience?",
        "No. Tier 1 courses (AutoCAD Phase-2, SketchUp, and Revit BIM) start from structured fundamentals and build up to production-grade deliverables.",
        "## How do seat reservation and tuition settlement work?",
        "Submitting a course registration generates a tracking code (NL-...) and reserves your place pending verification by our admissions team.",
        "## Are cohorts in-person or online?",
        "In-person cohorts take place in Damghan, with live online and hybrid formats scheduled on the academy calendar.",
      ]}
      extra={
        <p className="text-xs text-muted-foreground">
          {fa
            ? "پاسخ سوال خود را پیدا نکردید؟ از صفحه تماس و مشاوره برای ما بنویسید."
            : "Still have questions? Visit the Contact & Advising page to reach our team directly."}
        </p>
      }
    />
  );
}
