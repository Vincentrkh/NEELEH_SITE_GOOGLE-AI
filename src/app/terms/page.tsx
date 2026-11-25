import { StaticCmsPage } from "@/components/static-cms-page";

export const dynamic = "force-dynamic";

export default function TermsPage() {
  return (
    <StaticCmsPage
      slug="terms"
      fallbackTitleFa="قوانین ثبت‌نام و انصراف"
      fallbackTitleEn="Enrollment Terms & Cancellation Policy"
      fallbackBodyFa={[
        "ثبت‌نام آنلاین در سایت آکادمی نیله به‌منزله ثبت رزرو اولیه است و پس از بررسی ظرفیت نوبت و هماهنگی نهایی با هنرجو قطعی می‌شود.",
        "## حضور، جزوات و مالکیت محتوا",
        "- فایل‌های تمرین و جزوات آموزشی داخل پنل کاربری منحصراً برای استفاده آموزشی هنرجویان ثبت‌نام‌شده در همان دوره ارائه می‌شوند.",
        "- تغییر نوبت یا درخواست انصراف پیش از شروع رسمی ترم از طریق واحد آموزش امکان‌پذیر است.",
      ]}
      fallbackBodyEn={[
        "Online course registration creates an initial reservation that is finalized after seat verification and advisor confirmation.",
        "## Handouts & Cohort Transfers",
        "- Course datasets and studio handouts available in the Student Portal are licensed exclusively for enrolled learners.",
        "- Cohort transfers or cancellation requests prior to session start are coordinated directly through the admissions desk.",
      ]}
    />
  );
}
