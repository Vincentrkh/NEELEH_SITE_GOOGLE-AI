import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { localeNumber, localeDate, localeDateTime } from "@/lib/format";
import { dict, getServerLang } from "@/lib/i18n";
import {
  ClipboardList,
  Inbox,
  BookOpen,
  Users,
  Newspaper,
  FileText,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import { CountUp } from "@/components/count-up";

export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const user = await getCurrentUser();
  const lang = await getServerLang();
  const t = dict[lang].dashboard;

  const isAdmin = !!user?.roles.includes("ADMIN");
  const canViewRegs = isAdmin || !!user?.permissions.includes("registration.view");
  const canViewLeads = isAdmin || !!user?.permissions.includes("lead.view");
  const canViewCourses = isAdmin || !!user?.permissions.includes("course.view");
  const canViewUsers = isAdmin || !!user?.permissions.includes("user.view");
  const canViewPosts = isAdmin || !!user?.permissions.includes("post.view");
  const canViewFiles = isAdmin || !!user?.permissions.includes("file.upload");
  const canManageTheme = isAdmin || !!user?.permissions.includes("theme.manage");

  const [
    regsTotal,
    regsPending,
    leadsNew,
    leadsTotal,
    coursesPublished,
    coursesTotal,
    studentsCount,
    postsPublished,
    postsDraft,
    filesCount,
    recentRegs,
    recentLeads,
  ] = await Promise.all([
    canViewRegs ? db.registration.count() : Promise.resolve(0),
    canViewRegs ? db.registration.count({ where: { status: "PENDING" } }) : Promise.resolve(0),
    canViewLeads ? db.lead.count({ where: { status: "NEW" } }) : Promise.resolve(0),
    canViewLeads ? db.lead.count() : Promise.resolve(0),
    canViewCourses ? db.course.count({ where: { published: true } }) : Promise.resolve(0),
    canViewCourses ? db.course.count() : Promise.resolve(0),
    canViewUsers
      ? db.user.count({
          where: { userRoles: { some: { role: { name: "STUDENT" } } } },
        })
      : Promise.resolve(0),
    canViewPosts ? db.post.count({ where: { status: "PUBLISHED" } }) : Promise.resolve(0),
    canViewPosts ? db.post.count({ where: { status: "DRAFT" } }) : Promise.resolve(0),
    canViewFiles ? db.fileAsset.count() : Promise.resolve(0),
    canViewRegs
      ? db.registration.findMany({
          take: 6,
          orderBy: { createdAt: "desc" },
          include: {
            student: { select: { name: true, nameEn: true, phone: true } },
            course: { select: { title: true, titleEn: true, slug: true } },
          },
        })
      : Promise.resolve([]),
    canViewLeads
      ? db.lead.findMany({
          take: 6,
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const stats = [
    ...(canViewRegs
      ? [
          {
            icon: ClipboardList,
            label: t.statRegistrations,
            value: localeNumber(lang, regsTotal),
            hint: t.statRegistrationsHint.replace("{n}", localeNumber(lang, regsPending)),
            href: "/dashboard/registrations",
          },
        ]
      : []),
    ...(canViewLeads
      ? [
          {
            icon: Inbox,
            label: t.statLeads,
            value: localeNumber(lang, leadsNew),
            hint: t.statLeadsHint.replace("{n}", localeNumber(lang, leadsTotal)),
            href: "/dashboard/leads",
          },
        ]
      : []),
    ...(canViewCourses
      ? [
          {
            icon: BookOpen,
            label: t.statCourses,
            value: localeNumber(lang, coursesPublished),
            hint: t.statCoursesHint.replace("{n}", localeNumber(lang, coursesTotal)),
            href: "/dashboard/courses",
          },
        ]
      : []),
    ...(canViewUsers
      ? [
          {
            icon: Users,
            label: t.statStudents,
            value: localeNumber(lang, studentsCount),
            hint: t.statStudentsHint,
            href: "/dashboard/users",
          },
        ]
      : []),
    ...(canViewPosts
      ? [
          {
            icon: Newspaper,
            label: t.statPosts,
            value: localeNumber(lang, postsPublished),
            hint: t.statPostsHint.replace("{n}", localeNumber(lang, postsDraft)),
            href: "/dashboard/posts",
          },
        ]
      : []),
    ...(canViewFiles
      ? [
          {
            icon: FileText,
            label: t.statFiles,
            value: localeNumber(lang, filesCount),
            hint: t.statFilesHint,
            href: "/dashboard/files",
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          {t.eyebrow}
        </p>
        <h1 className="text-3xl sm:text-4xl font-medium tracking-[-0.03em]">
          <bdi>{lang === "en" ? (user?.nameEn || user?.name) : user?.name}</bdi>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t.dateSummary.replace("{date}", localeDate(lang, new Date()))}
        </p>
      </div>

      {/* Stat cards — ورود پلکانی با stagger */}
      <div className="ds-stagger grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          const content = (
            <div className="ds-stat group h-full rounded-lg border border-border bg-card p-4 sm:p-5 hover:border-foreground/30">
              <div className="flex items-start justify-between mb-3">
                <Icon className="size-4 text-muted-foreground" aria-hidden />
                <TrendingUp className="size-3 text-muted-foreground/60" aria-hidden />
              </div>
              <div className="text-2xl sm:text-3xl font-medium tracking-tight">
                <CountUp value={s.value} lang={lang} />
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground/70">
                {s.hint}
              </div>
            </div>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="block">
              {content}
            </Link>
          ) : (
            <div key={s.label}>{content}</div>
          );
        })}
      </div>

      {/* Two-column recent activity */}
      {(canViewRegs || canViewLeads) && (
        <div className="grid lg:grid-cols-2 gap-8">
          {canViewRegs && (
            <section>
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                <h2 className="text-sm font-medium uppercase tracking-[0.14em]">
                  {t.sectionRecentRegs}
                </h2>
                <Link
                  href="/dashboard/registrations"
                  className="group flex min-h-[44px] items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t.viewAll}
                  <ArrowUpRight className="size-3 rtl:-scale-x-100 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
                </Link>
              </div>
              {recentRegs.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t.emptyRegs}
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {recentRegs.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center gap-3 py-3 text-sm"
                    >
                      <div className="grid size-8 place-items-center rounded-full bg-secondary text-xs font-medium shrink-0 uppercase">
                        {(lang === "en" ? (r.student.nameEn || r.student.name) : r.student.name).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate"><bdi>{lang === "en" ? (r.student.nameEn || r.student.name) : r.student.name}</bdi></div>
                        <div className="text-xs text-muted-foreground truncate">
                          <bdi>{lang === "en" ? (r.course.titleEn || r.course.title) : r.course.title}</bdi>
                        </div>
                      </div>
                      <div className="text-end shrink-0">
                        <div dir="ltr" className="text-xs text-muted-foreground">
                          {r.student.phone}
                        </div>
                        <div className="text-[10px] text-muted-foreground/70">
                          {localeDateTime(lang, r.createdAt)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {canViewLeads && (
            <section>
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                <h2 className="text-sm font-medium uppercase tracking-[0.14em]">
                  {t.sectionRecentLeads}
                </h2>
                <Link
                  href="/dashboard/leads"
                  className="group flex min-h-[44px] items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t.viewAll}
                  <ArrowUpRight className="size-3 rtl:-scale-x-100 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
                </Link>
              </div>
              {recentLeads.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t.emptyLeads}
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {recentLeads.map((l) => (
                    <li
                      key={l.id}
                      className="flex items-center gap-3 py-3 text-sm"
                    >
                      <div className="grid size-8 place-items-center rounded-full bg-amber-100 text-amber-700 text-xs font-medium shrink-0">
                        {l.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate"><bdi>{l.name}</bdi></div>
                        <div className="text-xs text-muted-foreground truncate">
                          {l.message.slice(0, 60) || "—"}
                        </div>
                      </div>
                      <div className="text-end shrink-0">
                        <div dir="ltr" className="text-xs text-muted-foreground">
                          {l.phone}
                        </div>
                        <div className="text-[10px] text-muted-foreground/70">
                          {localeDateTime(lang, l.createdAt)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}

      {/* Quick actions */}
      <section>
        <h2 className="text-sm font-medium uppercase tracking-[0.14em] mb-4">
          {t.sectionShortcuts}
        </h2>
        <div className="ds-stagger grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {canViewCourses && (
            <QuickAction
              href="/dashboard/courses"
              icon={BookOpen}
              label={t.quickManageCourses}
            />
          )}
          {canViewRegs && (
            <QuickAction
              href="/dashboard/registrations"
              icon={ClipboardList}
              label={t.quickReviewRegs}
            />
          )}
          {canViewPosts && (
            <QuickAction
              href="/dashboard/posts"
              icon={Newspaper}
              label={t.quickWritePost}
            />
          )}
          {canManageTheme && (
            <QuickAction
              href="/dashboard/theme"
              icon={FileText}
              label={t.quickTheme}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="ds-quick group flex min-h-[64px] items-center gap-3 rounded-lg border border-border bg-card px-4 hover:bg-secondary"
    >
      <Icon className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      <span className="text-sm font-medium">{label}</span>
      <ArrowUpRight className="size-3.5 ms-auto text-muted-foreground rtl:-scale-x-100 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
    </Link>
  );
}
