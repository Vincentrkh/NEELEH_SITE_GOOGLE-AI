"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Sparkles, X, ArrowUpRight, AlertCircle } from "lucide-react";
import { useLang } from "@/components/language-provider";

const SAMPLE_PROMPTS_FA = [
  "هیچ پیش‌زمینه‌ای در BIM ندارم؛ از کجا شروع کنم؟",
  "بین گرس‌هاپر و هوش مصنوعی کدام برای نما مناسب‌تر است؟",
  "برای ارتقای دفتر معماری و مستندات فاز ۲ چه دوره‌ای دارید؟",
];

const SAMPLE_PROMPTS_EN = [
  "I have no BIM background — which course should I start with?",
  "Should I take Grasshopper or AI Architecture for facade design?",
  "Which courses improve office Phase-2 documentation speed?",
];

export function CourseGuideDrawer({
  triggerLabel,
  triggerClassName,
}: {
  triggerLabel?: string;
  triggerClassName?: string;
}) {
  const { lang, isRTL } = useLang();
  const fa = lang === "fa";

  const [open, setOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [configMissing, setConfigMissing] = useState(false);

  async function askGuide(qText: string) {
    if (!qText.trim()) return;
    if (!consent) {
      setErrorMsg(
        fa
          ? "پیش از ارسال پرسش، تیک رضایت پردازش هوش مصنوعی را فعال کنید."
          : "Please check the AI consent box before sending a question."
      );
      return;
    }

    setBusy(true);
    setErrorMsg(null);
    setAnswer(null);
    setConfigMissing(false);

    try {
      const res = await fetch("/api/ai/course-guide/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: qText.trim(), consentGranted: true }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        answer?: string;
        error?: string;
        code?: string;
      };
      if (!res.ok || !data.ok) {
        if (data.code === "CONFIG_REQUIRED") setConfigMissing(true);
        setErrorMsg(
          data.error ||
            (fa ? "پاسخ دریافت نشد." : "Unable to retrieve recommendation.")
        );
        return;
      }
      setAnswer(data.answer ?? "");
    } catch {
      setErrorMsg(fa ? "خطا در برقراری ارتباط با سرور." : "Network error while contacting server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          triggerClassName ??
          "inline-flex min-h-[44px] items-center gap-2 border border-border bg-background px-4 py-2 text-xs font-medium hover:border-foreground transition-colors whitespace-nowrap shrink-0"
        }
      >
        <Sparkles className="size-3.5 text-[#D92B2B]" aria-hidden />
        <span>{triggerLabel ?? (fa ? "راهنمای انتخاب دوره" : "Course Path Guide")}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={fa ? "راهنمای هوشمند انتخاب دوره" : "AI Course Path Guide"}
          className="fixed inset-0 z-[100] flex justify-end bg-black/40 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex h-full w-full max-w-lg flex-col bg-background border-s border-border p-6 sm:p-8 overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {fa ? "راهنمای دوره‌های آکادمی نیله" : "Neeleh Course Advisor"}
                </p>
                <h2 className="text-xl font-medium tracking-tight">
                  {fa ? "پیشنهاد مسیر آموزشی متناسب با هدف شما" : "Find your learning track"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={fa ? "بستن پنجره" : "Close dialog"}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-border hover:bg-secondary transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-5 space-y-5 flex-1">
              <div className="rounded-md border border-border bg-secondary/40 p-4 text-xs leading-relaxed text-muted-foreground">
                {fa
                  ? "این دستیار فقط بر اساس سرفصل‌ها، مدت و اطلاعات واقعی موجود در کاتالوگ نیله پاسخ می‌دهد."
                  : "Recommendations are grounded strictly in Neeleh's published course catalog, prerequisites, and curriculum."}
              </div>

              {/* Sample prompts */}
              <div>
                <div className="text-xs text-muted-foreground mb-2">
                  {fa ? "نمونه پرسش‌ها" : "Quick prompts"}
                </div>
                <div className="flex flex-col gap-2">
                  {(fa ? SAMPLE_PROMPTS_FA : SAMPLE_PROMPTS_EN).map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => setQuestion(sp)}
                      className="text-start text-xs leading-relaxed rounded-md border border-border px-3 py-2.5 hover:border-foreground/50 hover:bg-secondary/40 transition-colors"
                    >
                      {sp}
                    </button>
                  ))}
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  askGuide(question);
                }}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="guide-q" className="block text-xs text-muted-foreground mb-1.5">
                    {fa ? "پیش‌زمینه و هدف خود را بنویسید" : "Describe your background & goal"}
                  </label>
                  <textarea
                    id="guide-q"
                    rows={3}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={
                      fa
                        ? "مثلاً: دانشجوی معماری هستم، اتوکد بلدم و می‌خواهم طراحی نما و پارامتریک یاد بگیرم..."
                        : "e.g. Architecture grad with AutoCAD experience aiming for parametric facades..."
                    }
                    className="w-full rounded-md border border-border bg-transparent p-3 text-sm outline-none focus:border-foreground transition-colors"
                  />
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer text-xs leading-relaxed text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 size-4 accent-foreground"
                  />
                  <span>
                    {fa
                      ? "موافقم متن پرسش من برای پیشنهاد مسیر دوره از طریق سرویس هوش مصنوعی پردازش شود."
                      : "I consent to processing my query via the AI course advisor service."}
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 rounded-md bg-foreground text-background px-5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  {fa ? "دریافت پیشنهاد مسیر" : "Get recommendation"}
                </button>
              </form>

              {errorMsg && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950 space-y-2">
                  <div className="flex items-start gap-2 font-medium">
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                  {configMissing && (
                    <div className="flex flex-wrap gap-3 pt-1">
                      <Link
                        href="/courses"
                        onClick={() => setOpen(false)}
                        className="underline font-medium"
                      >
                        {fa ? "مشاهده کاتالوگ دوره‌ها" : "Browse all courses"}
                      </Link>
                      <Link
                        href="/#consult"
                        onClick={() => setOpen(false)}
                        className="underline font-medium"
                      >
                        {fa ? "ثبت مشاوره تلفنی رایگان" : "Request human consultation"}
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {answer && (
                <div className="rounded-md border border-border bg-card p-4 space-y-3">
                  <div className="text-xs font-medium text-foreground">
                    {fa ? "مسیر پیشنهادی نیله" : "Recommended Path"}
                  </div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                    {answer}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <Link href="/courses" onClick={() => setOpen(false)} className="inline-flex items-center gap-1 hover:text-foreground">
                <span>{fa ? "کاتالوگ کامل" : "Full catalog"}</span>
                <ArrowUpRight className={`size-3.5 ${isRTL ? "-scale-x-100" : ""}`} />
              </Link>
              <Link href="/calendar" onClick={() => setOpen(false)} className="inline-flex items-center gap-1 hover:text-foreground">
                <span>{fa ? "تقویم ترم‌ها" : "Cohort calendar"}</span>
                <ArrowUpRight className={`size-3.5 ${isRTL ? "-scale-x-100" : ""}`} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
