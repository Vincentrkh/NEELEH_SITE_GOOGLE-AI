import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  localeNumber,
  localeDate,
  localePrice,
  tierLabel,
  regLabel,
  paymentLabel,
  resourceKindLabel,
} from "@/lib/format";
import { getServerLang } from "@/lib/i18n";
import { pickString } from "@/lib/content";
import { syncAndGetRegistrationGantt } from "@/lib/attendance-sync";
import { ensureDefaultCourseExams } from "@/lib/exam-seed";
import { evaluateExamEligibility } from "@/lib/exam-rules";
import {
  ArrowRight,
  Award,
  BookOpen,
  Download,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  Mail,
} from "lucide-react";
import { ProfileEditor } from "@/components/profile-editor";
import { AttendanceGantt } from "@/components/attendance-gantt";
import { StudentCartable } from "@/components/student-cartable";
import type { Metadata } from "next";
import { PanelLogoutButton } from "@/components/panel-logout-button";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PanelPage() {
  const lang = await getServerLang();
  const fa = lang === "fa";
  const user = await getCurrentUser();
  if (!user) redirect("/login/?next=/panel/");

  await ensureDefaultCourseExams();

  const [dbProfile, registrations, totalCount, inboxItems] = await Promise.all([
    db.user.findUnique({
      where: { id: user.id },
      select: {
        telegram: true,
        whatsapp: true,
        eitaa: true,
        bale: true,
        instagram: true,
        linkedin: true,
      },
    }),
    db.registration.findMany({
      where: { studentId: user.id, status: { not: "CANCELLED" } },
      orderBy: { createdAt: "desc" },
      include: {
        course: {
          select: {
            id: true,
            slug: true,
            title: true,
            titleEn: true,
            tier: true,
            category: true,
            categoryEn: true,
            durationHrs: true,
            bannerUrl: true,
            sections: { select: { id: true, title: true, items: true, order: true }, orderBy: { order: "asc" } },
            resources: {
              select: {
                id: true,
                title: true,
                kind: true,
                url: true,
                file: { select: { url: true, filename: true, mimeType: true, size: true } },
                createdAt: true,
              },
              orderBy: { createdAt: "desc" },
            },
            sessions: { select: { id: true, title: true, date: true, order: true }, orderBy: { order: "asc" } },
            exam: {
              select: {
                id: true,
                title: true,
                titleEn: true,
                passingScore: true,
                durationMins: true,
                maxAttempts: true,
                minProgressPercent: true,
                requireCourseCompletion: true,
                isPublished: true,
                _count: { select: { questions: true } },
              },
            },
          },
        },
        attendance: { select: { sessionId: true, present: true } },
        examAttempts: {
          orderBy: { submittedAt: "desc" },
          select: { id: true, scorePercent: true, passed: true, submittedAt: true },
        },
        certificate: {
          select: {
            certificateCode: true,
            scorePercent: true,
            issuedAt: true,
            revokedAt: true,
          },
        },
      },
    }),
    db.registration.count({
      where: { studentId: user.id, status: { not: "CANCELLED" } },
    }),
    db.studentMessageRecipient.findMany({
      where: { studentId: user.id },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        message: {
          select: {
            id: true,
            title: true,
            body: true,
            channels: true,
            isBroadcast: true,
            createdAt: true,
            sender: { select: { name: true } },
            course: { select: { title: true, titleEn: true } },
          },
        },
      },
    }),
  ]);

  const ganttByRegId = new Map(
    await Promise.all(
      registrations.map(async (r) => {
        const g = await syncAndGetRegistrationGantt(r.id, lang);
        return [r.id, g] as const;
      }),
    ),
  );

  const cartableMessages = inboxItems.map((item) => ({
    recipientId: item.id,
    messageId: item.message.id,
    title: item.message.title,
    body: item.message.body,
    channels: item.message.channels.split(",").filter(Boolean),
    isBroadcast: item.message.isBroadcast,
    senderName: item.message.sender?.name ?? null,
    courseTitle: item.message.course?.title ?? null,
    courseTitleEn: item.message.course?.titleEn ?? null,
    readAt: item.readAt ? item.readAt.toISOString() : null,
    createdAt: item.message.createdAt.toISOString(),
  }));

  const unreadCount = cartableMessages.filter((m) => !m.readAt).length;
  const confirmedCount = registrations.filter((r) => r.status === "CONFIRMED").length;
  const pendingCount = registrations.filter((r) => r.status === "PENDING").length;

  return (
    <main className="min-h-[100svh]">
      <header className="border-b border-border sticky top-0 bg-background/85 backdrop-blur z-30">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-4 flex items-center justify-between gap-6">
          <Link href="/" className="text-sm font-semibold whitespace-nowrap shrink-0">
            {fa ? "آکادمی نیله" : "Neeleh Academy"}
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/courses/"
              className="flex min-h-[40px] items-center px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            >
              {fa ? "دوره‌ها" : "Courses"}
            </Link>
            <Link
              href="/calendar/"
              className="flex min-h-[40px] items-center px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            >
              {fa ? "تقویم" : "Calendar"}
            </Link>
            {(user.roles.includes("ADMIN") || user.roles.includes("EDITOR")) && (
              <Link
                href="/dashboard/"
                className="flex min-h-[40px] items-center px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
              >
                {fa ? "پنل مدیریت" : "Admin"}
              </Link>
            )}
            <PanelLogoutButton label={fa ? "خروج" : "Sign out"} />
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-10 sm:py-14">
        <div className="mb-10">
          <p className="text-xs text-muted-foreground mb-2">
            {fa ? "پنل هنرجویی" : "Student Portal"}
          </p>
          <h1 className="text-3xl sm:text-4xl font-medium tracking-[-0.03em]">
            {fa ? "سلام،" : "Hello,"} {user.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {localeDate(lang, new Date())} —{" "}
            {fa
              ? "خلاصه‌ای از دوره‌ها، گانت پیشرفت، کارتابل پیام‌ها و جزوات شما در آکادمی نیله."
              : "Your enrollments, progress Gantt, academy inbox, and course handouts."}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          <StatCard
            icon={BookOpen}
            label={fa ? "دوره‌های ثبت‌نام‌شده" : "Enrolled courses"}
            value={localeNumber(lang, totalCount)}
          />
          <StatCard
            icon={CheckCircle2}
            label={fa ? "تایید شده" : "Confirmed"}
            value={localeNumber(lang, confirmedCount)}
            highlight
          />
          <StatCard
            icon={Clock}
            label={fa ? "در انتظار تایید" : "Pending review"}
            value={localeNumber(lang, pendingCount)}
          />
          <StatCard
            icon={Mail}
            label={fa ? "پیام خوانده‌نشده" : "Unread inbox"}
            value={localeNumber(lang, unreadCount)}
            highlight={unreadCount > 0}
          />
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-8">
          <div className="min-w-0 space-y-8">
            <StudentCartable initialMessages={cartableMessages} />

            <section className="min-w-0">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-6">
                <h2 className="text-sm font-semibold">{fa ? "دوره‌های من و گانت پیشرفت" : "My courses & progress Gantt"}</h2>
                <Link
                  href="/courses"
                  className="flex min-h-[40px] items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
                >
                  {fa ? "ثبت‌نام دوره جدید" : "Explore courses"}
                  <ArrowRight className="size-3.5 rtl:-scale-x-100" />
                </Link>
              </div>

              {registrations.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-10 text-center">
                  <BookOpen className="size-8 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    {fa ? "هنوز در دوره‌ای ثبت‌نام نکرده‌اید." : "You haven't enrolled in any courses yet."}
                  </p>
                  <Link
                    href="/courses"
                    className="inline-flex min-h-[44px] items-center rounded-md bg-foreground text-background px-5 text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    {fa ? "مشاهده دوره‌ها" : "Browse courses"}
                  </Link>
                </div>
              ) : (
                <ul className="space-y-5">
                  {registrations.map((r) => {
                    const gantt = ganttByRegId.get(r.id) ?? null;
                    const resources = r.status === "CONFIRMED" ? r.course.resources : [];
                    return (
                      <li
                        key={r.id}
                        className="rounded-lg border border-border bg-card overflow-hidden"
                      >
                        <div className="p-5 border-b border-border">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-1.5">
                                <span>{tierLabel(lang, r.course.tier)}</span>
                                <span aria-hidden>·</span>
                                <span>
                                  <bdi>{pickString(lang, r.course.category, r.course.categoryEn)}</bdi>
                                </span>
                                {r.trackingCode && (
                                  <>
                                    <span aria-hidden>·</span>
                                    <span dir="ltr" className="font-mono tabular-nums text-foreground">
                                      {r.trackingCode}
                                    </span>
                                  </>
                                )}
                              </div>
                              <h3 className="text-base font-medium">
                                <Link
                                  href={`/courses/${r.course.slug}`}
                                  className="hover:underline underline-offset-4"
                                >
                                  <bdi>{pickString(lang, r.course.title, r.course.titleEn)}</bdi>
                                </Link>
                              </h3>
                            </div>

                            <div className="text-end text-xs">
                              <div
                                className={`font-medium ${
                                  r.status === "CONFIRMED" ? "text-emerald-700" : "text-amber-700"
                                }`}
                              >
                                {regLabel(lang, r.status)}
                              </div>
                              <div className="text-muted-foreground mt-0.5 tabular-nums">
                                {paymentLabel(lang, r.paymentStatus)}
                                {r.priceSnapshot != null && r.priceSnapshot > 0
                                  ? ` · ${localePrice(lang, r.priceSnapshot)}`
                                  : ""}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground tabular-nums">
                            <span>
                              {fa ? "تاریخ ثبت‌نام:" : "Registered:"} {localeDate(lang, r.createdAt)}
                            </span>
                            <span>
                              {fa ? "مدت دوره:" : "Duration:"} {localeNumber(lang, r.course.durationHrs)}{" "}
                              {fa ? "ساعت" : "hours"}
                            </span>
                            {gantt && (
                              <span>
                                {fa ? "پیشرفت گانت:" : "Progress:"}{" "}
                                {localeNumber(lang, gantt.stats.progressPercent)}
                                {fa ? "٪" : "%"} ({localeNumber(lang, gantt.stats.completedSessions)}/
                                {localeNumber(lang, gantt.stats.totalSessions)})
                              </span>
                            )}
                          </div>
                        </div>

                        {r.status === "CONFIRMED" && gantt && (
                          <div className="p-4 sm:p-5 border-b border-border bg-background/40">
                            <AttendanceGantt
                              initialGantt={gantt}
                              mode="student"
                              courseTitle={pickString(lang, r.course.title, r.course.titleEn)}
                            />
                          </div>
                        )}

                        {r.status === "CONFIRMED" && resources.length > 0 && (
                          <div className="p-5 bg-secondary/20">
                            <div className="text-xs font-medium text-muted-foreground mb-3">
                              {fa ? "فایل‌ها و جزوات دوره" : "Course files & handouts"}
                            </div>
                            <ul className="grid sm:grid-cols-2 gap-2">
                              {resources.map((res) => {
                                const url = res.file?.url ?? res.url;
                                if (!url) return null;
                                return (
                                  <li key={res.id}>
                                    <a
                                      href={url}
                                      target={url.startsWith("http") ? "_blank" : undefined}
                                      rel="noopener noreferrer"
                                      className="flex min-h-[44px] items-center gap-3 rounded-md border border-border bg-background px-3 py-2 hover:border-foreground/30 transition-colors"
                                    >
                                      <FileText className="size-4 text-muted-foreground shrink-0" />
                                      <div className="min-w-0 flex-1">
                                        <div className="text-sm truncate">{res.title}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {resourceKindLabel(lang, res.kind) ?? res.kind}
                                        </div>
                                      </div>
                                      <Download className="size-3.5 text-muted-foreground shrink-0" />
                                    </a>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}

                        {r.status === "CONFIRMED" && r.course.exam && (() => {
                          const exam = r.course.exam;
                          const activeCert =
                            r.certificate && !r.certificate.revokedAt ? r.certificate : null;
                          const eligibility = evaluateExamEligibility({
                            registrationStatus: r.status,
                            isPublished: exam.isPublished,
                            questionCount: exam._count.questions,
                            progressPercent: gantt?.stats.progressPercent ?? 0,
                            minProgressPercent: exam.minProgressPercent,
                            requireCourseCompletion: exam.requireCourseCompletion,
                            examUnlocked: r.examUnlocked,
                            attemptsUsed: r.examAttempts.length,
                            maxAttempts: exam.maxAttempts,
                            hasCertificate: Boolean(activeCert),
                          });
                          const bestScore = r.examAttempts.reduce(
                            (max, a) => Math.max(max, a.scorePercent),
                            0,
                          );

                          return (
                            <div className="p-4 sm:p-5 border-t border-border bg-card flex flex-wrap items-center justify-between gap-4">
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 text-xs font-semibold">
                                  <Award
                                    className={`size-4 shrink-0 ${
                                      activeCert ? "text-emerald-600" : "text-muted-foreground"
                                    }`}
                                  />
                                  <span>
                                    {fa ? "آزمون پایان دوره و گواهینامه" : "Final Exam & Certificate"}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {activeCert
                                    ? fa
                                      ? `قبول شدید با نمره ${localeNumber(lang, activeCert.scorePercent)}٪ · کد گواهینامه: ${activeCert.certificateCode}`
                                      : `Passed with ${activeCert.scorePercent}% · Certificate ${activeCert.certificateCode}`
                                    : eligibility.eligible
                                      ? fa
                                        ? `آزمون آماده است (${localeNumber(lang, exam._count.questions)} سوال · ${localeNumber(lang, exam.durationMins)} دقیقه · حدنصاب ${localeNumber(lang, exam.passingScore)}٪)`
                                        : `Ready (${exam._count.questions} questions · ${exam.durationMins} min · pass ${exam.passingScore}%)`
                                      : eligibility.reason === "PROGRESS_TOO_LOW"
                                        ? fa
                                          ? `پس از رسیدن پیشرفت گانت به ${localeNumber(lang, exam.minProgressPercent)}٪ (یا باز شدن توسط مدیر) فعال می‌شود.`
                                          : `Unlocks at ${exam.minProgressPercent}% Gantt progress (or admin unlock).`
                                        : r.examAttempts.length > 0
                                          ? fa
                                            ? `بهترین نمره ثبت‌شده: ${localeNumber(lang, bestScore)}٪`
                                            : `Best attempt score: ${bestScore}%`
                                          : fa
                                            ? "در انتظار فعال‌سازی آزمون"
                                            : "Awaiting activation"}
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                {activeCert ? (
                                  <Link
                                    href={`/certificates/${encodeURIComponent(activeCert.certificateCode)}/`}
                                    className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-emerald-700 text-white px-4 text-xs font-medium hover:bg-emerald-800 transition-colors whitespace-nowrap"
                                  >
                                    <Award className="size-3.5" />
                                    <span>{fa ? "مشاهده و چاپ گواهینامه" : "View Certificate"}</span>
                                  </Link>
                                ) : (
                                  <Link
                                    href={`/panel/exam/${encodeURIComponent(r.id)}/`}
                                    className={`inline-flex min-h-[40px] items-center gap-2 rounded-md px-4 text-xs font-medium transition-colors whitespace-nowrap ${
                                      eligibility.eligible
                                        ? "bg-foreground text-background hover:opacity-90"
                                        : "border border-border bg-secondary/50 text-foreground hover:bg-secondary"
                                    }`}
                                  >
                                    {!eligibility.eligible && <Lock className="size-3.5" />}
                                    <span>
                                      {eligibility.eligible
                                        ? fa
                                          ? "ورود به آزمون پایان دوره"
                                          : "Take Final Exam"
                                        : fa
                                          ? "جزئیات و وضعیت آزمون"
                                          : "Exam Details"}
                                    </span>
                                  </Link>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {r.status === "PENDING" && (
                          <div className="p-4 bg-amber-50 border-t border-amber-200">
                            <p className="text-xs text-amber-800 leading-relaxed">
                              {fa
                                ? "ثبت‌نام شما در انتظار تایید است. پس از تایید، فایل‌ها، جزوات و گانت تعاملی حضور و غیاب دوره در اینجا فعال می‌شوند."
                                : "Your registration is pending approval. Course files, handouts, and your interactive attendance Gantt unlock once confirmed."}
                            </p>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <ProfileEditor
              initial={{
                name: user.name,
                phone: user.phone,
                email: user.email,
                field: user.field,
                education: user.education,
                bio: user.bio,
                telegram: dbProfile?.telegram ?? null,
                whatsapp: dbProfile?.whatsapp ?? null,
                eitaa: dbProfile?.eitaa ?? null,
                bale: dbProfile?.bale ?? null,
                instagram: dbProfile?.instagram ?? null,
                linkedin: dbProfile?.linkedin ?? null,
              }}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between mb-2">
        <Icon className={`size-4 ${highlight ? "text-emerald-600" : "text-muted-foreground"}`} />
      </div>
      <div className="text-xl sm:text-2xl font-medium tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
