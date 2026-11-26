"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/components/language-provider";
import { useToast } from "@/hooks/use-toast";
import { localeDateTime, localeNumber } from "@/lib/format";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  HelpCircle,
  Loader2,
  Lock,
  Play,
  Send,
  ShieldCheck,
  XCircle,
} from "lucide-react";

export type StudentQuestionSafe = {
  id: string;
  order: number;
  prompt: string;
  promptEn: string | null;
  options: Array<{ id: string; text: string; textEn?: string }>;
  points: number;
};

export type ExamAttemptSummary = {
  id: string;
  attemptNumber: number;
  scorePercent: number;
  earnedPoints: number;
  totalPoints: number;
  passed: boolean;
  submittedAt: string;
};

export type ExamRunnerProps = {
  registrationId: string;
  courseTitle: string;
  courseTitleEn: string | null;
  courseSlug: string;
  progressPercent: number;
  examUnlocked: boolean;
  exam: {
    id: string;
    title: string;
    titleEn: string | null;
    description: string;
    descriptionEn: string;
    passingScore: number;
    durationMins: number;
    maxAttempts: number;
    minProgressPercent: number;
    requireCourseCompletion: boolean;
    questionCount: number;
  } | null;
  eligibility: {
    eligible: boolean;
    reason?: string;
  };
  questions: StudentQuestionSafe[];
  attempts: ExamAttemptSummary[];
  certificate: {
    certificateCode: string;
    scorePercent: number;
    issuedAt: string;
  } | null;
};

type GradedBreakdownItem = {
  questionId: string;
  selectedOptionId: string | null;
  correctOptionId: string;
  isCorrect: boolean;
  pointsEarned: number;
  maxPoints: number;
  explanation: string;
  explanationEn: string;
};

type SubmitResponse = {
  ok: boolean;
  attemptNumber: number;
  scorePercent: number;
  earnedPoints: number;
  totalPoints: number;
  passed: boolean;
  passingScore: number;
  breakdown: GradedBreakdownItem[];
  certificate: {
    certificateCode: string;
    scorePercent: number;
    issuedAt: string;
  } | null;
  error?: string;
};

export function StudentExamRunner(props: ExamRunnerProps) {
  const { lang } = useLang();
  const fa = lang === "fa";
  const { toast } = useToast();

  const [stage, setStage] = useState<"briefing" | "active" | "result">("briefing");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(
    (props.exam?.durationMins ?? 20) * 60,
  );
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResponse | null>(null);

  useEffect(() => {
    if (stage !== "active") return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [stage]);

  function startExam() {
    setAnswers({});
    setCurrentIdx(0);
    setStartedAt(new Date().toISOString());
    setSecondsLeft((props.exam?.durationMins ?? 20) * 60);
    setStage("active");
  }

  async function submitExam() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/panel/exams/${encodeURIComponent(props.registrationId)}/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers, startedAt }),
        },
      );
      const json = (await res.json()) as SubmitResponse;
      if (!res.ok) {
        toast({
          title: fa ? "ثبت آزمون ناموفق بود" : "Submission failed",
          description: json.error,
          variant: "destructive",
        });
        return;
      }
      setResult(json);
      setStage("result");
      toast({
        title: json.passed
          ? fa
            ? "تبریک! آزمون را با موفقیت گذراندید"
            : "Congratulations! Exam passed"
          : fa
            ? "نتیجه آزمون ثبت شد"
            : "Exam attempt graded",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function formatCountdown(totalSecs: number) {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const mm = String(mins).padStart(2, "0");
    const ss = String(secs).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  const courseName = fa
    ? props.courseTitle
    : props.courseTitleEn || props.courseTitle;

  const examTitle = props.exam
    ? fa
      ? props.exam.title
      : props.exam.titleEn || props.exam.title
    : courseName;

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = props.questions.length;

  function reasonText(reason?: string) {
    switch (reason) {
      case "NOT_CONFIRMED":
        return fa
          ? "ثبت‌نام شما هنوز توسط آکادمی تایید نهایی نشده است."
          : "Your enrollment is pending admin confirmation.";
      case "PROGRESS_TOO_LOW":
        return fa
          ? `پیشرفت فعلی گانت شما ${localeNumber(lang, props.progressPercent)}٪ است. حداقل پیشرفت مورد نیاز برای شرکت در آزمون ${localeNumber(lang, props.exam?.minProgressPercent ?? 70)}٪ است (یا مدیر باید قفل آزمون را باز کند).`
          : `Your current Gantt progress is ${props.progressPercent}%. At least ${props.exam?.minProgressPercent ?? 70}% progress is required unless unlocked by admin.`;
      case "MAX_ATTEMPTS_REACHED":
        return fa
          ? "سقف دفعات مجاز شرکت در این آزمون تکمیل شده است."
          : "Maximum number of exam attempts reached.";
      case "ALREADY_CERTIFIED":
        return fa
          ? "گواهینامه این دوره قبلاً برای شما صادر شده است."
          : "You have already earned the certificate for this course.";
      case "NO_QUESTIONS":
        return fa
          ? "سوالات این آزمون هنوز توسط مدرس منتشر نشده است."
          : "Questions are not yet published for this course.";
      default:
        return fa ? "این آزمون در حال حاضر در دسترس نیست." : "Exam currently unavailable.";
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/panel/"
          className="inline-flex min-h-[40px] items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5 rtl:-scale-x-100" />
          <span>{fa ? "بازگشت به پنل هنرجو" : "Back to Student Portal"}</span>
        </Link>

        <span className="text-xs text-muted-foreground">{courseName}</span>
      </div>

      {/* STAGE 1: BRIEFING */}
      {stage === "briefing" && (
        <div className="rounded-lg border border-border bg-card p-6 sm:p-8 space-y-6">
          <div className="space-y-2 border-b border-border pb-5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {fa ? "ارزیابی پایان دوره" : "Final Course Assessment"}
            </p>
            <h1 className="text-2xl sm:text-3xl font-medium tracking-[-0.02em]">
              {examTitle}
            </h1>
            {props.exam?.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {fa ? props.exam.description : props.exam.descriptionEn || props.exam.description}
              </p>
            )}
          </div>

          {props.certificate && (
            <div className="rounded-lg border border-emerald-300 bg-emerald-50/75 p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Award className="size-6 text-emerald-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-emerald-950">
                    {fa
                      ? "گواهینامه رسمی شما صادر شده است"
                      : "Your Official Certificate Is Issued"}
                  </div>
                  <div className="text-xs text-emerald-900 tabular-nums">
                    {fa ? "کد استعلام:" : "Serial:"}{" "}
                    <span dir="ltr" className="font-mono font-semibold">
                      {props.certificate.certificateCode}
                    </span>{" "}
                    · {fa ? "نمره نهایی:" : "Score:"}{" "}
                    {localeNumber(lang, props.certificate.scorePercent)}
                    {fa ? "٪" : "%"}
                  </div>
                </div>
              </div>
              <Link
                href={`/certificates/${encodeURIComponent(props.certificate.certificateCode)}/`}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-emerald-700 text-white px-4 text-xs font-medium hover:bg-emerald-800"
              >
                <Award className="size-4" />
                <span>{fa ? "مشاهده و چاپ گواهینامه" : "Open & Print Certificate"}</span>
              </Link>
            </div>
          )}

          {props.exam && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-md border border-border bg-secondary/20 p-4">
                <div className="text-xs text-muted-foreground">{fa ? "تعداد سوالات" : "Questions"}</div>
                <div className="mt-1 text-xl font-medium tabular-nums">
                  {localeNumber(lang, props.exam.questionCount)}
                </div>
              </div>
              <div className="rounded-md border border-border bg-secondary/20 p-4">
                <div className="text-xs text-muted-foreground">{fa ? "مدت زمان" : "Duration"}</div>
                <div className="mt-1 text-xl font-medium tabular-nums">
                  {localeNumber(lang, props.exam.durationMins)}{" "}
                  <span className="text-xs text-muted-foreground">{fa ? "دقیقه" : "min"}</span>
                </div>
              </div>
              <div className="rounded-md border border-border bg-secondary/20 p-4">
                <div className="text-xs text-muted-foreground">{fa ? "حدنصاب قبولی" : "Pass Score"}</div>
                <div className="mt-1 text-xl font-medium tabular-nums">
                  {localeNumber(lang, props.exam.passingScore)}
                  {fa ? "٪" : "%"}
                </div>
              </div>
              <div className="rounded-md border border-border bg-secondary/20 p-4">
                <div className="text-xs text-muted-foreground">{fa ? "پیشرفت گانت شما" : "Your Progress"}</div>
                <div className="mt-1 text-xl font-medium tabular-nums">
                  {localeNumber(lang, props.progressPercent)}
                  {fa ? "٪" : "%"}
                </div>
              </div>
            </div>
          )}

          {!props.eligibility.eligible ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 text-xs text-amber-900">
              <Lock className="size-4 shrink-0 mt-0.5 text-amber-700" />
              <div className="space-y-1 leading-relaxed">
                <div className="font-semibold">
                  {fa ? "وضعیت دسترسی به آزمون" : "Exam Access Status"}
                </div>
                <p>{reasonText(props.eligibility.reason)}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
                <span>
                  {fa
                    ? "تصحیح به‌صورت خودکار و امن در سرور انجام می‌شود و در صورت قبولی گواهینامه فوراً صادر می‌گردد."
                    : "Server-graded automatically. Upon passing, your verifiable certificate is issued immediately."}
                </span>
              </div>
              <button
                type="button"
                onClick={startExam}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-foreground text-background px-6 text-sm font-medium hover:opacity-90"
              >
                <Play className="size-4" />
                <span>{fa ? "شروع آزمون" : "Start Final Exam"}</span>
              </button>
            </div>
          )}

          {props.attempts.length > 0 && (
            <div className="pt-4 border-t border-border space-y-2.5">
              <div className="text-xs font-medium text-muted-foreground">
                {fa ? "سوابق شرکت قبلی شما" : "Previous Attempts"}
              </div>
              <ul className="divide-y divide-border rounded-md border border-border text-xs">
                {props.attempts.map((att) => (
                  <li key={att.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                    <span>
                      {fa ? "نوبت" : "Attempt"} #{localeNumber(lang, att.attemptNumber)} ·{" "}
                      <span className="text-muted-foreground">
                        {localeDateTime(lang, att.submittedAt)}
                      </span>
                    </span>
                    <span
                      className={`font-medium tabular-nums ${
                        att.passed ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {localeNumber(lang, att.scorePercent)}
                      {fa ? "٪" : "%"} ({att.passed ? (fa ? "قبول" : "Passed") : fa ? "مردود" : "Failed"})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* STAGE 2: ACTIVE EXAM */}
      {stage === "active" && props.questions[currentIdx] && (() => {
        const q = props.questions[currentIdx];
        const selected = answers[q.id];

        return (
          <div className="space-y-5">
            {/* Sticky Exam Progress Header */}
            <div className="sticky top-4 z-20 rounded-lg border border-border bg-card/95 backdrop-blur p-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs text-muted-foreground">{examTitle}</div>
                <div className="text-sm font-semibold tabular-nums">
                  {fa ? "سوال" : "Question"} {localeNumber(lang, currentIdx + 1)}{" "}
                  {fa ? "از" : "of"} {localeNumber(lang, totalQuestions)} ·{" "}
                  <span className="text-muted-foreground font-normal">
                    {localeNumber(lang, answeredCount)} {fa ? "پاسخ‌داده‌شده" : "answered"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div
                  dir="ltr"
                  className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-mono tabular-nums ${
                    secondsLeft < 120
                      ? "border-rose-300 bg-rose-50 text-rose-700 font-semibold"
                      : "border-border bg-secondary/40"
                  }`}
                >
                  <Clock className="size-3.5" />
                  <span>{formatCountdown(secondsLeft)}</span>
                </div>
              </div>
            </div>

            {/* Question Stepper */}
            <div className="flex flex-wrap gap-1.5">
              {props.questions.map((item, idx) => {
                const isCurrent = idx === currentIdx;
                const isAnswered = Boolean(answers[item.id]);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCurrentIdx(idx)}
                    className={`size-9 rounded-md text-xs font-medium tabular-nums border transition-colors ${
                      isCurrent
                        ? "border-foreground bg-foreground text-background"
                        : isAnswered
                          ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {localeNumber(lang, idx + 1)}
                  </button>
                );
              })}
            </div>

            {/* Question Card */}
            <div className="rounded-lg border border-border bg-card p-6 sm:p-8 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-lg font-medium leading-relaxed">
                  {fa ? q.prompt : q.promptEn || q.prompt}
                </h2>
                <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                  {localeNumber(lang, q.points)} {fa ? "امتیاز" : "pt"}
                </span>
              </div>

              <div className="space-y-2.5">
                {q.options.map((opt) => {
                  const active = selected === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))
                      }
                      className={`w-full text-start rounded-lg border px-4 py-3.5 text-sm transition-colors flex items-center gap-3 ${
                        active
                          ? "border-foreground bg-secondary/60 font-medium"
                          : "border-border bg-background hover:bg-secondary/30"
                      }`}
                    >
                      <span
                        className={`grid size-6 place-items-center rounded border text-xs uppercase font-mono shrink-0 ${
                          active
                            ? "border-foreground bg-foreground text-background"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {opt.id}
                      </span>
                      <span className="flex-1 leading-relaxed">
                        {fa ? opt.text : opt.textEn || opt.text}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentIdx === 0}
                    onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-border px-4 text-xs font-medium hover:bg-secondary disabled:opacity-40"
                  >
                    <ArrowRight className="size-3.5 ltr:-scale-x-100" />
                    <span>{fa ? "قبلی" : "Previous"}</span>
                  </button>
                  <button
                    type="button"
                    disabled={currentIdx >= totalQuestions - 1}
                    onClick={() =>
                      setCurrentIdx((i) => Math.min(totalQuestions - 1, i + 1))
                    }
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-border px-4 text-xs font-medium hover:bg-secondary disabled:opacity-40"
                  >
                    <span>{fa ? "بعدی" : "Next"}</span>
                    <ArrowLeft className="size-3.5 ltr:-scale-x-100" />
                  </button>
                </div>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void submitExam()}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-md bg-emerald-700 text-white px-5 text-xs font-medium hover:bg-emerald-800 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  <span>{fa ? "ثبت نهایی و تصحیح آزمون" : "Submit Final Answers"}</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* STAGE 3: RESULT BREAKDOWN */}
      {stage === "result" && result && (
        <div className="space-y-6">
          <div
            className={`rounded-lg border p-6 sm:p-8 space-y-4 ${
              result.passed
                ? "border-emerald-300 bg-emerald-50/75"
                : "border-rose-200 bg-rose-50/60"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                {result.passed ? (
                  <Award className="size-8 text-emerald-700 shrink-0" />
                ) : (
                  <HelpCircle className="size-8 text-rose-700 shrink-0" />
                )}
                <div>
                  <h2 className="text-xl font-semibold">
                    {result.passed
                      ? fa
                        ? "قبولی در آزمون و صدور گواهینامه!"
                        : "Exam Passed & Certificate Issued!"
                      : fa
                        ? "نمره شما به حدنصاب قبولی نرسید"
                        : "Score Below Passing Threshold"}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 tabular-nums">
                    {fa ? "نمره نهایی شما:" : "Your Score:"}{" "}
                    <span className="font-semibold text-foreground">
                      {localeNumber(lang, result.scorePercent)}
                      {fa ? "٪" : "%"}
                    </span>{" "}
                    ({localeNumber(lang, result.earnedPoints)} /{" "}
                    {localeNumber(lang, result.totalPoints)} {fa ? "امتیاز" : "pts"} ·{" "}
                    {fa ? "حدنصاب:" : "Pass:"} {localeNumber(lang, result.passingScore)}
                    {fa ? "٪" : "%"})
                  </p>
                </div>
              </div>

              {result.certificate ? (
                <Link
                  href={`/certificates/${encodeURIComponent(result.certificate.certificateCode)}/`}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-emerald-700 text-white px-5 text-xs font-medium hover:bg-emerald-800"
                >
                  <Award className="size-4" />
                  <span>{fa ? "مشاهده و چاپ گواهینامه رسمی" : "View Official Certificate"}</span>
                </Link>
              ) : (
                <Link
                  href="/panel/"
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-md border border-border bg-background px-4 text-xs font-medium hover:bg-secondary"
                >
                  <span>{fa ? "بازگشت به پنل" : "Back to Portal"}</span>
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold">
              {fa ? "کارنامه تشریحی سوالات" : "Answer Key & Explanations"}
            </h3>
            <ul className="divide-y divide-border">
              {props.questions.map((q, idx) => {
                const item = result.breakdown.find((b) => b.questionId === q.id);
                if (!item) return null;
                return (
                  <li key={q.id} className="py-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-medium">
                        {localeNumber(lang, idx + 1)}.{" "}
                        {fa ? q.prompt : q.promptEn || q.prompt}
                      </div>
                      {item.isCorrect ? (
                        <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="size-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>
                        {fa ? "انتخاب شما:" : "Your answer:"}{" "}
                        <span className="font-mono uppercase text-foreground">
                          {item.selectedOptionId ?? "—"}
                        </span>{" "}
                        · {fa ? "پاسخ صحیح:" : "Correct:"}{" "}
                        <span className="font-mono uppercase text-emerald-700 font-semibold">
                          {item.correctOptionId}
                        </span>
                      </div>
                      {(item.explanation || item.explanationEn) && (
                        <p className="text-foreground/85 bg-secondary/30 rounded px-3 py-2">
                          {fa ? item.explanation : item.explanationEn || item.explanation}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
