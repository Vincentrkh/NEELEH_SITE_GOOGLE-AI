"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/components/language-provider";
import {
  SOCIAL_PLATFORMS,
  SOCIAL_PLATFORM_META,
  hasAtLeastOneSocial,
  type SocialPlatform,
  type StudentSocials,
} from "@/lib/socials";
import { CheckCircle2, Loader2, MessageSquareShare, AlertCircle } from "lucide-react";

type SessionOption = {
  id: string;
  title: string;
  dateLabel: string;
  format: string;
};

type Success = {
  studentName: string;
  courseTitle: string;
  trackingCode: string;
};

export function RegisterForm({
  slug,
  initialName,
  initialPhone,
  initialEmail,
  initialField,
  initialEducation,
  initialSocials,
  isLoggedIn,
  sessions = [],
}: {
  slug: string;
  initialName?: string;
  initialPhone?: string;
  initialEmail?: string;
  initialField?: string;
  initialEducation?: string;
  initialSocials?: StudentSocials;
  isLoggedIn?: boolean;
  sessions?: SessionOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { lang } = useLang();
  const fa = lang === "fa";

  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<Success | null>(null);
  const [socialError, setSocialError] = useState(false);
  const [socials, setSocials] = useState<Record<SocialPlatform, string>>({
    telegram: initialSocials?.telegram ?? "",
    whatsapp: initialSocials?.whatsapp ?? "",
    eitaa: initialSocials?.eitaa ?? "",
    bale: initialSocials?.bale ?? "",
    instagram: initialSocials?.instagram ?? "",
    linkedin: initialSocials?.linkedin ?? "",
  });

  const hasValidSocial = hasAtLeastOneSocial(socials);

  function setSocial(key: SocialPlatform, value: string) {
    setSocials((prev) => {
      const next = { ...prev, [key]: value };
      if (hasAtLeastOneSocial(next)) setSocialError(false);
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!hasValidSocial) {
      setSocialError(true);
      toast({
        title: fa ? "اطلاعات شبکه اجتماعی ناقص است" : "Social contact required",
        description: fa
          ? "حداقل یکی از پیام‌رسان‌ها یا شبکه‌های اجتماعی (تلگرام، واتساپ، ایتا، بله، اینستاگرام یا لینکدین) را وارد کنید."
          : "Please enter at least one social network or messenger handle.",
        variant: "destructive",
      });
      return;
    }

    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const res = await fetch("/api/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          sessionId: fd.get("sessionId") || undefined,
          name: fd.get("name"),
          phone: fd.get("phone") || initialPhone,
          password: fd.get("password"),
          email: fd.get("email"),
          field: fd.get("field"),
          education: fd.get("education"),
          note: fd.get("note"),
          telegram: socials.telegram,
          whatsapp: socials.whatsapp,
          eitaa: socials.eitaa,
          bale: socials.bale,
          instagram: socials.instagram,
          linkedin: socials.linkedin,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        studentName?: string;
        courseTitle?: string;
        trackingCode?: string;
      };
      if (!res.ok) {
        toast({
          title: fa ? "ثبت‌نام انجام نشد" : "Registration failed",
          description: data.error,
          variant: "destructive",
        });
        return;
      }
      setSuccess({
        studentName: data.studentName!,
        courseTitle: data.courseTitle!,
        trackingCode: data.trackingCode ?? "",
      });
      router.refresh();
    } catch {
      toast({
        title: fa ? "خطا" : "Error",
        description: fa
          ? "ارتباط برقرار نشد — دوباره تلاش کنید."
          : "Connection failed — please try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center sm:p-10">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="size-7" aria-hidden="true" />
        </div>
        <h2 className="mt-5 text-xl font-bold">
          {fa ? "ثبت‌نام شما با موفقیت ثبت شد" : "Registration recorded"}
        </h2>
        {success.trackingCode && (
          <div dir="ltr" className="mt-3 font-mono text-sm font-semibold tabular-nums text-emerald-700">
            {success.trackingCode}
          </div>
        )}
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          {fa ? (
            <>
              <strong className="text-foreground">{success.studentName}</strong> عزیز،
              درخواست ثبت‌نام شما در دوره «{success.courseTitle}» با وضعیت «در انتظار تایید» ثبت شد.
            </>
          ) : (
            <>
              <strong className="text-foreground">{success.studentName}</strong>, your registration
              for “{success.courseTitle}” is recorded with status “Pending review”.
            </>
          )}
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/panel"
            className="flex min-h-[48px] items-center justify-center rounded-md bg-foreground text-background px-8 text-sm font-medium transition-opacity hover:opacity-85 whitespace-nowrap"
          >
            {fa ? "ورود به پنل هنرجویی" : "Go to student panel"}
          </Link>
          <Link
            href="/courses"
            className="flex min-h-[48px] items-center justify-center rounded-md border border-border px-8 text-sm font-medium transition-colors hover:bg-secondary whitespace-nowrap"
          >
            {fa ? "مشاهده دوره‌های دیگر" : "Browse other courses"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5 rounded-lg border border-border bg-card p-6 sm:p-8">
      {isLoggedIn && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
          {fa
            ? "شما وارد حساب خود شده‌اید — می‌توانید مستقیم ثبت‌نام کنید."
            : "Signed in — your details are pre-filled for quick enrollment."}
        </div>
      )}

      {sessions.length > 0 && (
        <div className="grid gap-2">
          <label htmlFor="reg-session" className="text-xs text-muted-foreground">
            {fa ? "انتخاب نوبت / زمان‌بندی (اختیاری)" : "Cohort / Session (optional)"}
          </label>
          <select
            id="reg-session"
            name="sessionId"
            defaultValue={sessions[0]?.id ?? ""}
            className="bg-background border border-border rounded-md px-3 py-2.5 text-sm outline-none focus:border-foreground transition-colors min-h-[44px]"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} · {s.dateLabel} ({s.format})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor="reg-name" className="text-xs text-muted-foreground">
            {fa ? "نام و نام خانوادگی *" : "Full name *"}
          </label>
          <input
            id="reg-name"
            name="name"
            required
            minLength={3}
            defaultValue={initialName}
            placeholder={fa ? "مثلاً امیر کریمی" : "e.g. Sara Moradi"}
            autoComplete="name"
            className="bg-background border border-border rounded-md px-3 py-2.5 text-sm outline-none focus:border-foreground transition-colors min-h-[44px]"
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="reg-phone" className="text-xs text-muted-foreground">
            {fa ? "شماره موبایل * (نام کاربری)" : "Mobile phone * (username)"}
          </label>
          <input
            id="reg-phone"
            name="phone"
            required={!isLoggedIn}
            inputMode="tel"
            dir="ltr"
            defaultValue={initialPhone}
            disabled={isLoggedIn}
            className="bg-background border border-border rounded-md px-3 py-2.5 text-sm outline-none focus:border-foreground transition-colors text-start min-h-[44px] disabled:opacity-60"
            placeholder="0912 345 6789"
            autoComplete="tel"
          />
        </div>
      </div>

      {!isLoggedIn && (
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-2">
            <label htmlFor="reg-pass" className="text-xs text-muted-foreground">
              {fa ? "رمز عبور پنل هنرجویی *" : "Student panel password *"}
            </label>
            <input
              id="reg-pass"
              name="password"
              type="password"
              required
              minLength={6}
              dir="ltr"
              className="bg-background border border-border rounded-md px-3 py-2.5 text-sm outline-none focus:border-foreground transition-colors text-start min-h-[44px]"
              placeholder={fa ? "حداقل ۶ کاراکتر" : "At least 6 characters"}
              autoComplete="new-password"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="reg-email" className="text-xs text-muted-foreground">
              {fa ? "ایمیل (اختیاری — برای دریافت اطلاع‌رسانی)" : "Email (optional — for notifications)"}
            </label>
            <input
              id="reg-email"
              name="email"
              type="email"
              dir="ltr"
              defaultValue={initialEmail}
              className="bg-background border border-border rounded-md px-3 py-2.5 text-sm outline-none focus:border-foreground transition-colors text-start min-h-[44px]"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
        </div>
      )}

      {/* Mandatory Social Networks (at least 1 required) */}
      <div
        className={`rounded-lg border p-4 sm:p-5 space-y-4 transition-colors ${
          socialError
            ? "border-destructive bg-destructive/5"
            : "border-border bg-secondary/20"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquareShare className="size-4 text-muted-foreground" aria-hidden />
            <span className="text-sm font-medium">
              {fa ? "شبکه‌های اجتماعی و پیام‌رسان‌ها *" : "Social networks & messengers *"}
            </span>
          </div>
          <span
            className={`text-xs font-medium flex items-center gap-1 ${
              hasValidSocial ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {hasValidSocial ? (
              <>
                <CheckCircle2 className="size-3.5" aria-hidden />
                {fa ? "حداقل یک مورد تکمیل شد" : "Requirement met"}
              </>
            ) : (
              <>
                <AlertCircle className="size-3.5" aria-hidden />
                {fa ? "الزامی: حداقل ۱ مورد وارد شود" : "Required: enter at least 1"}
              </>
            )}
          </span>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {fa
            ? "برای هماهنگی کلاس‌ها، ارسال جزوات و اطلاعیه‌های فوری، ثبت آیدی یا شماره حداقل یکی از پیام‌رسان‌ها الزامی است."
            : "Provide at least one messenger or social handle for cohort coordination and direct notifications."}
        </p>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {SOCIAL_PLATFORMS.map((platform) => {
            const meta = SOCIAL_PLATFORM_META[platform];
            return (
              <div key={platform} className="grid gap-1.5">
                <label
                  htmlFor={`reg-social-${platform}`}
                  className="text-xs text-muted-foreground"
                >
                  {fa ? meta.labelFa : meta.labelEn}
                </label>
                <input
                  id={`reg-social-${platform}`}
                  name={platform}
                  type="text"
                  dir="ltr"
                  value={socials[platform]}
                  onChange={(e) => setSocial(platform, e.target.value)}
                  placeholder={fa ? meta.placeholderFa : meta.placeholderEn}
                  className="bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-foreground transition-colors text-start min-h-[42px]"
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor="reg-field" className="text-xs text-muted-foreground">
            {fa ? "رشته تحصیلی" : "Academic discipline"}
          </label>
          <input
            id="reg-field"
            name="field"
            defaultValue={initialField}
            placeholder={fa ? "مثلاً معماری" : "e.g. Architecture"}
            className="bg-background border border-border rounded-md px-3 py-2.5 text-sm outline-none focus:border-foreground transition-colors min-h-[44px]"
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="reg-edu" className="text-xs text-muted-foreground">
            {fa ? "مقطع یا سوابق" : "Degree / Experience"}
          </label>
          <input
            id="reg-edu"
            name="education"
            defaultValue={initialEducation}
            placeholder={fa ? "مثلاً کارشناسی معماری" : "e.g. B.Arch"}
            className="bg-background border border-border rounded-md px-3 py-2.5 text-sm outline-none focus:border-foreground transition-colors min-h-[44px]"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <label htmlFor="reg-note" className="text-xs text-muted-foreground">
          {fa ? "توضیحات (اختیاری)" : "Note (optional)"}
        </label>
        <textarea
          id="reg-note"
          name="note"
          rows={3}
          placeholder={
            fa
              ? "مثلاً: سابقه کار با اتوکد دارم؛ می‌خواهم برای استخدام در دفتر تقویت شوم."
              : "Share your tool experience or goals for this cohort…"
          }
          className="w-full bg-background border border-border rounded-md p-3 text-sm outline-none focus:border-foreground transition-colors resize-y min-h-[44px]"
        />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="flex min-h-[50px] items-center justify-center gap-2 bg-foreground text-background rounded-md px-6 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
      >
        {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        <span>{fa ? "ثبت‌نام و رزرو صندلی" : "Submit registration & reserve seat"}</span>
      </button>
      <p className="text-xs leading-5 text-muted-foreground">
        {fa
          ? "با ثبت‌نام، کد رهگیری اختصاصی دریافت می‌کنید و پس از تایید، فایل‌ها، کارتابل و گانت پیشرفت در پنل هنرجویی فعال می‌شوند."
          : "Upon registration you receive a unique tracking code; handouts, inbox, and your progress Gantt unlock once verified in your student panel."}
      </p>
    </form>
  );
}

