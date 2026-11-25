import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { localeNumber, localePriceParts, tierLabel, regStatusLabel } from "@/lib/format";
import { localizedCourse } from "@/lib/content";
import { dict, getServerLang } from "@/lib/i18n";
import { Plus, ExternalLink, Edit3, Eye, EyeOff } from "lucide-react";

export const dynamic = "force-dynamic";

const TIER_KEY: Record<string, "coursesTierBeginner" | "coursesTierIntermediate" | "coursesTierPro"> = {
  BEGINNER: "coursesTierBeginner",
  INTERMEDIATE: "coursesTierIntermediate",
  PRO: "coursesTierPro",
};

const REG_STATUS_KEY: Record<string, "coursesStatusOpen" | "coursesStatusFull" | "coursesStatusClosed"> = {
  OPEN: "coursesStatusOpen",
  FULL: "coursesStatusFull",
  CLOSED: "coursesStatusClosed",
};

export default async function DashboardCoursesPage() {
  const user = await getCurrentUser();
  const lang = await getServerLang();
  const isAdmin = !!user?.roles.includes("ADMIN");
  if (!isAdmin && !user?.permissions.includes("course.view")) {
    return <div className="p-8 text-center text-muted-foreground">{lang === "fa" ? "دسترسی مجاز نیست" : "Access denied"}</div>;
  }
  const canCreate = isAdmin || user?.permissions.includes("course.create");
  const canEdit = isAdmin || user?.permissions.includes("course.update");
  const t = dict[lang].dashboard;

  const courses = await db.course.findMany({
    orderBy: [{ tier: "asc" }, { sortOrder: "asc" }],
    include: {
      sections: { select: { id: true } },
      _count: {
        select: {
          registrations: { where: { status: { not: "CANCELLED" } } },
        },
      },
    },
  });

  const byTier: Record<string, typeof courses> = {
    BEGINNER: courses.filter((c) => c.tier === "BEGINNER"),
    INTERMEDIATE: courses.filter((c) => c.tier === "INTERMEDIATE"),
    PRO: courses.filter((c) => c.tier === "PRO"),
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            {t.coursesEyebrow}
          </p>
          <h1 className="text-3xl sm:text-4xl font-medium tracking-[-0.03em]">
            {t.coursesTitle}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t.coursesSummary
              .replace("{count}", localeNumber(lang, courses.length))
              .replace("{published}", localeNumber(lang, courses.filter((c) => c.published).length))}
          </p>
        </div>
        {canCreate && (
          <Link
            href="/dashboard/courses/new"
            className="flex min-h-[44px] items-center gap-2 bg-foreground text-background rounded-md px-5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="size-4" aria-hidden />
            {t.coursesNew}
          </Link>
        )}
      </div>

      {(["BEGINNER", "INTERMEDIATE", "PRO"] as const).map((tier) => {
        const list = byTier[tier];
        if (list.length === 0) return null;
        return (
          <section key={tier}>
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex items-center gap-1.5 border border-border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {tierLabel(lang, tier)}
              </span>
              <span className="text-xs text-muted-foreground">
                {localeNumber(lang, list.length)} {t.coursesCountSuffix}
              </span>
            </div>

            <div className="overflow-hidden rounded-lg border border-border bg-card overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="hidden md:table-header-group">
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium text-start px-4 py-3 w-12">
                      {t.coursesColIndex}
                    </th>
                    <th className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium text-start px-4 py-3 min-w-[200px]">
                      {t.coursesColTitle}
                    </th>
                    <th className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium text-start px-4 py-3 w-[140px]">
                      {t.coursesColCategory}
                    </th>
                    <th className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium text-center px-3 py-3 w-16">
                      {t.coursesColCapacity}
                    </th>
                    <th className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium text-center px-3 py-3 w-20">
                      {t.coursesColRegs}
                    </th>
                    <th className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium text-end px-4 py-3 w-[150px]">
                      {t.coursesColPrice}
                    </th>
                    <th className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium text-center px-3 py-3 w-[110px]">
                      {t.coursesColStatus}
                    </th>
                    <th className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium text-center px-3 py-3 w-24">
                      {t.coursesColActions}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {list.map((c, i) => {
                    const price = localePriceParts(lang, c.price);
                    const statusKey = REG_STATUS_KEY[c.regStatus] || "coursesStatusClosed";
                    const lc = localizedCourse(lang, c);
                    return (
                      <tr key={c.id} className="hover:bg-secondary/30 transition-colors align-middle">
                        <td className="text-xs text-muted-foreground tabular-nums px-4 py-4 align-middle hidden md:table-cell">
                          {localeNumber(lang, String(i + 1).padStart(2, "0"))}
                        </td>
                        <td className="px-4 py-4 align-middle min-w-0">
                          <Link
                            href={`/dashboard/courses/${c.id}`}
                            className="block text-sm font-medium hover:text-foreground transition-colors"
                            title={lc.title}
                          >
                            <span className="block truncate max-w-[280px]">
                              <bdi>{lc.title}</bdi>
                            </span>
                          </Link>
                          <div className="md:hidden text-xs text-muted-foreground mt-1 flex items-center gap-2">
                            <span className="truncate"><bdi>{lc.category}</bdi></span>
                            <span>•</span>
                            <span className="tabular-nums whitespace-nowrap">{price.num} {price.unit}</span>
                          </div>
                        </td>
                        <td className="hidden md:table-cell text-sm text-muted-foreground px-4 py-4 align-middle">
                          <span className="block truncate max-w-[130px]">
                            <bdi>{lc.category}</bdi>
                          </span>
                        </td>
                        <td className="hidden md:table-cell text-sm text-center tabular-nums px-3 py-4 align-middle text-muted-foreground">
                          {localeNumber(lang, c.capacity)}
                        </td>
                        <td className="hidden md:table-cell text-sm text-center tabular-nums px-3 py-4 align-middle">
                          <span className="font-medium text-foreground">{localeNumber(lang, c._count.registrations)}</span>
                          <span className="text-muted-foreground">/{localeNumber(lang, c.capacity)}</span>
                        </td>
                        <td className="hidden md:table-cell text-sm text-end px-4 py-4 align-middle">
                          {price.num ? (
                            <span className="tabular-nums whitespace-nowrap">
                              <span className="font-medium text-foreground">{price.num}</span>{" "}
                              <span className="text-muted-foreground text-xs">{price.unit}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">{price.unit}</span>
                          )}
                        </td>
                        <td className="hidden md:table-cell text-center px-3 py-4 align-middle">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-secondary text-foreground">
                            {t[statusKey]}
                          </span>
                        </td>
                        <td className="px-3 py-4 align-middle">
                          <div className="flex items-center justify-center gap-1">
                            {canEdit && (
                              <Link
                                href={`/dashboard/courses/${c.id}`}
                                className="flex min-h-[36px] min-w-[36px] items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-md"
                                aria-label={t.coursesActionEdit}
                                title={t.coursesActionEdit}
                              >
                                <Edit3 className="size-3.5" />
                              </Link>
                            )}
                            <Link
                              href={`/courses/${c.slug}`}
                              target="_blank"
                              className="flex min-h-[36px] min-w-[36px] items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-md"
                              aria-label={t.coursesActionView}
                              title={t.coursesActionView}
                            >
                              <ExternalLink className="size-3.5" />
                            </Link>
                            {c.published ? (
                              <Eye className="size-3.5 text-muted-foreground/70" aria-label="published" />
                            ) : (
                              <EyeOff className="size-3.5 text-muted-foreground/70" aria-label="unpublished" />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {courses.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">
            {t.coursesEmpty}
          </p>
          {canCreate && (
            <Link
              href="/dashboard/courses/new"
              className="inline-flex mt-4 items-center gap-2 bg-foreground text-background rounded-md px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="size-4" />
              {t.coursesCreateFirst}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
