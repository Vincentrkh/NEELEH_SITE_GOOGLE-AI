import Link from "next/link";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { localeNumber, localePrice, tierLabel } from "@/lib/format";
import { getServerLang } from "@/lib/i18n";
import { pickString } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function InstructorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lang = await getServerLang();
  const fa = lang === "fa";

  const instructor = await db.user.findUnique({
    where: { id: slug },
    select: {
      id: true,
      name: true,
      nameEn: true,
      bio: true,
      bioEn: true,
      field: true,
      education: true,
      avatarUrl: true,
      email: true,
      coursesTaught: {
        where: { published: true },
        select: {
          id: true, title: true, titleEn: true, slug: true, tier: true, category: true,
          durationHrs: true, price: true, description: true, descriptionEn: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!instructor) notFound();

  const displayName = fa ? instructor.name : (instructor.nameEn || instructor.name);
  const displayBio = fa ? instructor.bio : (instructor.bioEn || instructor.bio);

  return (
    <main className="min-h-[100svh]">
      <header className="border-b border-border">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-6 flex items-center justify-between">
          <Link href="/instructors" className="flex items-center gap-2.5 min-h-[44px] text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← {fa ? "مدرسین" : "Instructors"}
          </Link>
          <Link href="/courses" className="text-xs uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors">
            {fa ? "دوره‌ها" : "Courses"}
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1000px] px-5 sm:px-8 lg:px-12 py-12 sm:py-16">
        {/* پروفایل */}
        <div className="flex items-start gap-6 mb-12">
          {instructor.avatarUrl ? (
            <img src={instructor.avatarUrl} alt={displayName} className="size-20 sm:size-24 rounded-full object-cover" />
          ) : (
            <div className="size-20 sm:size-24 rounded-full bg-foreground/5 border border-border flex items-center justify-center text-2xl font-medium">
              {displayName.charAt(0)}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-medium tracking-[-0.03em]"><bdi>{displayName}</bdi></h1>
            <p className="text-sm text-muted-foreground mt-1">{instructor.field}</p>
            {instructor.education && (
              <p className="text-xs text-muted-foreground/70 mt-2 leading-relaxed">{instructor.education}</p>
            )}
          </div>
        </div>

        {/* بایو */}
        {displayBio && (
          <div className="mb-12">
            <h2 className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-4">{fa ? "درباره" : "About"}</h2>
            <p className="text-base leading-relaxed text-foreground/80 whitespace-pre-line">{displayBio}</p>
          </div>
        )}

        {/* دوره‌ها */}
        {instructor.coursesTaught.length > 0 && (
          <div>
            <h2 className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-4">
              {fa
                ? `دوره‌های این مدرس (${localeNumber(lang, instructor.coursesTaught.length)})`
                : `Courses by this instructor (${localeNumber(lang, instructor.coursesTaught.length)})`}
            </h2>
            <div className="grid gap-3">
              {instructor.coursesTaught.map((c) => (
                <Link
                  key={c.id}
                  href={`/courses/${c.slug}`}
                  className="group flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 hover:border-foreground/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm group-hover:text-foreground transition-colors"><bdi>{pickString(lang, c.title, c.titleEn)}</bdi></h3>
                    {c.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{pickString(lang, c.description, c.descriptionEn)}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{tierLabel(lang, c.tier)}</span>
                      <span>•</span>
                      <span>{localeNumber(lang, c.durationHrs)} {fa ? "ساعت" : "hours"}</span>
                    </div>
                  </div>
                  <span className="text-sm font-medium tabular-nums">
                    {c.price > 0 ? localePrice(lang, c.price) : fa ? "رایگان" : "Free"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
