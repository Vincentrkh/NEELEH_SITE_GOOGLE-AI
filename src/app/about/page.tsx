import Link from "next/link";
import { StaticCmsPage } from "@/components/static-cms-page";

export const dynamic = "force-dynamic";

export default function AboutPage() {
  return (
    <StaticCmsPage
      slug="about"
      fallbackTitleFa="درباره آکادمی معماری نیله"
      fallbackTitleEn="About Neeleh Architecture Academy"
      fallbackBodyFa={[
        "آکادمی تخصصی نیله (مستقل از مکان، با برگزاری دوره‌های حضوری در دامغان و آنلاین سراسری) با تکیه بر تجربه‌های گردآمده از سال ۱۳۷۹ تا امروز در طراحی معماری، مدلسازی اطلاعات ساختمان (BIM) و مهندسی نرم‌افزارهای تخصصی فعالیت می‌کند.",
        "## رویکرد آموزشی",
        "- مسیر پلکانی از نقشه‌کشی فاز ۲ و ضوابط اجرایی تا طراحی پارامتریک با گرس‌هاپر و معماری مبتنی بر هوش مصنوعی",
        "- پروژه‌محور و بر اساس استانداردهای واقعی دفاتر مهندسی و بازار کار معماری",
        "- تمرکز بر خروجی قابل استفاده در پورتفولیو و ساخت‌پذیری طرح‌ها",
      ]}
      fallbackBodyEn={[
        "Neeleh Architecture Academy (location-independent, with in-person cohorts in Damghan and nationwide live online classes) brings together architectural, BIM, and computational design experiences accumulated since 2000.",
        "## Educational Philosophy",
        "- Structured three-tier progression from Phase-2 drafting to parametric Grasshopper systems and AI-augmented architecture",
        "- Studio-grounded projects built around real municipal codes and engineering deliverables",
        "- Focus on constructible geometry, portfolio rigor, and clear studio workflows",
      ]}
      extra={
        <div className="flex flex-wrap gap-3">
          <Link
            href="/courses"
            className="inline-flex min-h-[44px] items-center rounded-md bg-foreground px-5 text-xs font-medium text-background hover:opacity-90 transition-opacity"
          >
            مشاهده همه دوره‌ها / All Courses
          </Link>
          <Link
            href="/contact"
            className="inline-flex min-h-[44px] items-center rounded-md border border-border px-5 text-xs font-medium hover:bg-secondary transition-colors"
          >
            تماس و مشاوره / Contact
          </Link>
        </div>
      }
    />
  );
}
