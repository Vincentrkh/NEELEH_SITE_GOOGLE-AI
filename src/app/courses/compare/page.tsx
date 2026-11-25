import Link from "next/link";
import { db } from "@/lib/db";
import { localeNumber, localePrice, tierLabel, regStatusLabel } from "@/lib/format";
import { getServerLang } from "@/lib/i18n";
import { pickString, pickLines } from "@/lib/content";
import { Check, X, Clock, Users } from "lucide-react";
import { Reveal } from "@/lib/motion-effects";
import { BrandLogoGraphic } from "@/components/brand-logo";

export const dynamic = "force-dynamic";

export default async function ComparePage() {
  const lang = await getServerLang();

  const courses = await db.course.findMany({
    where: { published: true },
    orderBy: [{ tier: "asc" }, { sortOrder: "asc" }],
    select: {
      id: true, slug: true, title: true, titleEn: true, tier: true,
      category: true, categoryEn: true,
      durationHrs: true, price: true, capacity: true, regStatus: true,
      about: true, outputs: true, outputsEn: true, prereqs: true, prereqsEn: true,
      _count: { select: { registrations: { where: { status: { not: "CANCELLED" } } } } },
      instructor: { select: { name: true, nameEn: true } },
    },
  });

  type Row = {
    c: typeof courses[0];
    title: string;
    category: string;
    prereqs: string;
    outputs: string;
  };

  const rows: Row[] = courses.map((c) => ({
    c,
    title: pickString(lang, c.title, c.titleEn),
    category: pickString(lang, c.category, c.categoryEn),
    prereqs: pickLines(lang, c.prereqs, c.prereqsEn).join("\n"),
    outputs: pickLines(lang, c.outputs, c.outputsEn).join("\n"),
  }));

  const features = [
    { key: "tier", label: lang === "fa" ? "سطح" : "Level", get: (r: Row) => tierLabel(lang, r.c.tier) },
    { key: "category", label: lang === "fa" ? "دسته" : "Category", get: (r: Row) => r.category },
    { key: "duration", label: lang === "fa" ? "مدت دوره" : "Duration", get: (r: Row) => `${localeNumber(lang, r.c.durationHrs)} ${lang === "fa" ? "ساعت" : "hours"}` },
    { key: "price", label: lang === "fa" ? "شهریه" : "Tuition", get: (r: Row) => r.c.price > 0 ? localePrice(lang, r.c.price) : (lang === "fa" ? "رایگان" : "Free") },
    { key: "capacity", label: lang === "fa" ? "ظرفیت" : "Capacity", get: (r: Row) => `${localeNumber(lang, r.c.capacity)} ${lang === "fa" ? "نفر" : "seats"}` },
    { key: "instructor", label: lang === "fa" ? "مدرس" : "Instructor", get: (r: Row) => pickString(lang, r.c.instructor?.name, r.c.instructor?.nameEn) || "—" },
    { key: "prereqs", label: lang === "fa" ? "پیش‌نیاز" : "Prerequisites", get: (r: Row) => r.prereqs.slice(0, 60) + (r.prereqs.length > 60 ? "..." : "") || "—" },
    { key: "outputs", label: lang === "fa" ? "خروجی دوره" : "Course outcomes", get: (r: Row) => r.outputs.slice(0, 80) + (r.outputs.length > 80 ? "..." : "") || "—" },
  ];

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

      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-12">
        <div className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">[{lang === "fa" ? " مقایسه " : " Compare "}]</p>
          <h1 className="text-3xl sm:text-5xl font-medium tracking-[-0.04em]">{lang === "fa" ? "مقایسه‌ی دوره‌ها" : "Compare courses"}</h1>
          <p className="mt-4 text-sm text-muted-foreground">
            {lang === "fa"
              ? "همه‌ی دوره‌های نیله در یک نگاه — برای انتخاب آگاهانه."
              : "All Neeleh courses at a glance — for an informed choice."}
          </p>
        </div>

        {/* جدول مقایسه — قابل اسکرول افقی */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-start p-3 font-medium text-muted-foreground text-xs uppercase tracking-[0.14em] whitespace-nowrap sticky start-0 bg-background">
                  {lang === "fa" ? "ویژگی" : "Feature"}
                </th>
                {rows.map(({ c, title, category }) => (
                  <th key={c.id} className="text-start p-3 min-w-[180px]">
                    <Link href={`/courses/${c.slug}`} className="font-medium hover:underline underline-offset-4">
                      <bdi>{title}</bdi>
                    </Link>
                    <p className="text-xs text-muted-foreground mt-1"><bdi>{category}</bdi></p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((f) => (
                <tr key={f.key} className="border-b border-border/50 hover:bg-foreground/[0.02] transition-colors">
                  <td className="p-3 font-medium text-muted-foreground text-xs whitespace-nowrap sticky start-0 bg-background">
                    {f.label}
                  </td>
                  {rows.map((r) => (
                    <td key={r.c.id} className="p-3 text-foreground/80 whitespace-nowrap">
                      {f.get(r)}
                    </td>
                  ))}
                </tr>
              ))}
              {/* وضعیت ثبت‌نام */}
              <tr className="border-b border-border/50">
                <td className="p-3 font-medium text-muted-foreground text-xs whitespace-nowrap sticky start-0 bg-background">{lang === "fa" ? "وضعیت" : "Status"}</td>
                {rows.map(({ c }) => {
                  const full = c._count.registrations >= c.capacity;
                  return (
                    <td key={c.id} className="p-3">
                      {full ? (
                        <span className="text-xs text-amber-700 bg-amber-50 border border-amber-400/40 px-2 py-0.5 rounded-full">{regStatusLabel(lang, "FULL")}</span>
                      ) : c.regStatus === "OPEN" ? (
                        <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-400/40 px-2 py-0.5 rounded-full">{regStatusLabel(lang, "OPEN")}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{regStatusLabel(lang, "CLOSED")}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
              {/* دکمه ثبت‌نام */}
              <tr>
                <td className="p-3 sticky start-0 bg-background"></td>
                {rows.map(({ c }) => (
                  <td key={c.id} className="p-3">
                    <Link
                      href={`/courses/${c.slug}`}
                      className="inline-flex items-center min-h-[36px] px-3 rounded-md text-xs bg-foreground text-background hover:opacity-90 transition-opacity"
                    >
                      {lang === "fa" ? "مشاهده دوره" : "View course"}
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
