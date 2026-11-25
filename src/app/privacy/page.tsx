import { StaticCmsPage } from "@/components/static-cms-page";

export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return (
    <StaticCmsPage
      slug="privacy"
      fallbackTitleFa="حریم خصوصی و محافظت از داده‌ها"
      fallbackTitleEn="Privacy & Data Protection"
      fallbackBodyFa={[
        "آکادمی معماری نیله متعهد به حفاظت از اطلاعات تماس، سوابق تحصیلی و داده‌های ثبت‌نام هنرجویان است.",
        "## استفاده از اطلاعات",
        "- شماره تماس و ایمیل شما صرفاً برای هماهنگی کلاس‌ها، صدور کد پیگیری ثبت‌نام و پاسخ به درخواست‌های مشاوره استفاده می‌شود.",
        "- اطلاعات کاربران هرگز در اختیار اشخاص ثالث یا شبکه‌های تبلیغاتی قرار نمی‌گیرد.",
        "## قابلیت‌های هوش مصنوعی و رضایت صریح",
        "استفاده از راهنمای هوشمند انتخاب دوره کاملاً اختیاری است و تنها با تیک تایید و رضایت صریح کاربر در لحظه پرسش انجام می‌شود.",
      ]}
      fallbackBodyEn={[
        "Neeleh Architecture Academy is committed to protecting learner contact details, enrollment records, and study notes.",
        "## Data Use",
        "- Phone numbers and email addresses are used strictly for enrollment coordination, attendance records, and academic advising.",
        "- Learner records are never sold or shared with external advertising networks.",
        "## Optional AI Features & Explicit Consent",
        "Using the AI Course Path Advisor is entirely optional and requires explicit user consent prior to transmitting a query.",
      ]}
    />
  );
}
