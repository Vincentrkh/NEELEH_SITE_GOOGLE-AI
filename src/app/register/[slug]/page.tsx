import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  localeDateTime,
  localeNumber,
  localePrice,
  tierLabel,
  regLabel,
} from "@/lib/format";
import { getServerLang } from "@/lib/i18n";
import { pickString } from "@/lib/content";
import { RegisterForm } from "@/components/register-form";
import { PublicShell } from "@/components/public-shell";
import { ArrowRight, Clock, Users, CheckCircle2, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lang = await getServerLang();
  const fa = lang === "fa";

  const course = await db.course.findUnique({
    where: { slug },
    include: {
      sessions: { orderBy: [{ startAt: "asc" }, { order: "asc" }] },
      _count: {
        select: {
          registrations: { where: { status: { not: "CANCELLED" } } },
        },
      },
    },
  });

  if (!course || !course.published) notFound();

  const user = await getCurrentUser();
  const userSocials = user
    ? await db.user.findUnique({
        where: { id: user.id },
        select: {
          telegram: true,
          whatsapp: true,
          eitaa: true,
          bale: true,
          instagram: true,
          linkedin: true,
        },
      })
    : null;
  const remaining = Math.max(0, course.capacity - course._count.registrations);
  const isOpen = course.regStatus === "OPEN" && remaining > 0;

  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-5 sm:px-8 lg:px-12 py-10 sm:py-16">
        <div className="mb-6">
          <Link
            href={`/courses/${course.slug}`}
            className="inline-flex min-h-[40px] items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            <ArrowRight className="size-3.5 rtl:-scale-x-100" aria-hidden />
            <span>{fa ? "بازگشت به صفحه دوره" : "Back to course page"}</span>
          </Link>
        </div>

        <div className="mb-8">
          <div className="text-xs text-muted-foreground mb-2">
            {tierLabel(lang, course.tier)}
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium tracking-[-0.03em] leading-tight">
            {fa ? "ثبت‌نام در دوره" : "Course registration"}
          </h1>
          <h2 className="mt-2 text-lg sm:text-xl text-muted-foreground leading-snug">
            <bdi>{pickString(lang, course.title, course.titleEn)}</bdi>
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10 p-4 rounded-lg border border-border bg-card">
          <SummaryItem
            icon={Clock}
            label={fa ? "مدت" : "Duration"}
            value={`${localeNumber(lang, course.durationHrs)} ${fa ? "ساعت" : "hours"}`}
          />
          <SummaryItem
            icon={Users}
            label={fa ? "باقیمانده" : "Seats left"}
            value={`${localeNumber(lang, remaining)} ${fa ? "نفر" : "seats"}`}
            highlight={remaining > 0}
          />
          <SummaryItem
            icon={MapPin}
            label={fa ? "محل برگزاری" : "Location"}
            value={fa ? "حضوری — دامغان / آنلاین" : "In person — Damghan / Online"}
          />
          <div className="text-end">
            <div className="text-xs text-muted-foreground mb-1">
              {fa ? "شهریه" : "Tuition"}
            </div>
            <div className="text-base font-medium tabular-nums">
              {localePrice(lang, course.price)}
            </div>
          </div>
        </div>

        {user && <AlreadyRegisteredCheck studentId={user.id} courseId={course.id} />}

        {isOpen ? (
          <RegisterForm
            slug={course.slug}
            initialName={user?.name}
            initialPhone={user?.phone}
            initialEmail={user?.email ?? undefined}
            initialField={user?.field ?? undefined}
            initialEducation={user?.education ?? undefined}
            initialSocials={userSocials ?? undefined}
            isLoggedIn={!!user}
            sessions={course.sessions.map((s) => ({
              id: s.id,
              title: s.title,
              dateLabel: localeDateTime(lang, s.startAt ?? s.date),
              format: s.format ?? "IN_PERSON",
            }))}
          />
        ) : (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-8 text-center">
            <CheckCircle2 className="size-8 mx-auto text-amber-600 mb-3" />
            <h2 className="text-lg font-medium mb-2">
              {fa ? "ظرفیت این دوره تکمیل شده است" : "This course is fully booked"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {fa
                ? "برای اطلاع از تاریخ شروع دوره بعدی، با آکادمی در تماس باشید."
                : "Contact the academy for the next cohort schedule."}
            </p>
            <Link
              href="/courses"
              className="inline-flex mt-5 min-h-[44px] items-center justify-center rounded-md border border-border px-6 text-sm font-medium hover:bg-secondary transition-colors"
            >
              {fa ? "مشاهده دوره‌های دیگر" : "Browse other courses"}
            </Link>
          </div>
        )}
      </div>
    </PublicShell>
  );
}

function SummaryItem({
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
    <div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </div>
      <div className={`text-sm font-medium tabular-nums ${highlight ? "text-emerald-700" : ""}`}>
        {value}
      </div>
    </div>
  );
}

async function AlreadyRegisteredCheck({
  studentId,
  courseId,
}: {
  studentId: string;
  courseId: string;
}) {
  const lang = await getServerLang();
  const fa = lang === "fa";
  const existing = await db.registration.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
  });
  if (!existing || existing.status === "CANCELLED") return null;

  return (
    <div className="mb-6 rounded-lg border border-emerald-300 bg-emerald-50 p-5">
      <div className="flex items-center gap-2 mb-1">
        <CheckCircle2 className="size-4 text-emerald-600" />
        <span className="text-sm font-medium text-emerald-900">
          {fa ? "شما در این دوره ثبت‌نام کرده‌اید" : "You're already registered for this course"}
        </span>
      </div>
      <p className="text-xs text-emerald-700">
        {fa ? "وضعیت:" : "Status:"} {regLabel(lang, existing.status)}
        {existing.trackingCode ? ` · ${existing.trackingCode}` : ""}
      </p>
      <Link
        href="/panel"
        className="inline-flex mt-3 min-h-[42px] items-center rounded-md bg-emerald-700 text-white px-4 text-xs font-medium hover:opacity-90 transition-opacity"
      >
        {fa ? "ورود به پنل هنرجویی" : "Go to student panel"}
      </Link>
    </div>
  );
}
