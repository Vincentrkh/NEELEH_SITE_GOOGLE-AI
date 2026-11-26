"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useLang } from "@/components/language-provider";
import { useToast } from "@/hooks/use-toast";
import { localeDate, localeNumber } from "@/lib/format";
import {
  Award,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";

export type AdminExamQuestion = {
  id: string;
  order: number;
  prompt: string;
  promptEn: string | null;
  options: Array<{ id: string; text: string; textEn?: string }>;
  correctOptionId: string;
  explanation: string;
  explanationEn: string;
  points: number;
};

export type AdminExamCourse = {
  id: string;
  slug: string;
  title: string;
  titleEn: string | null;
  tier: string;
  published: boolean;
  durationHrs: number;
  exam: {
    id: string;
    courseId: string;
    title: string;
    titleEn: string | null;
    description: string;
    descriptionEn: string;
    passingScore: number;
    durationMins: number;
    maxAttempts: number;
    requireCourseCompletion: boolean;
    minProgressPercent: number;
    isPublished: boolean;
    attemptsCount: number;
    certificatesCount: number;
    questions: AdminExamQuestion[];
  } | null;
};

export type AdminCertificateItem = {
  id: string;
  certificateCode: string;
  studentName: string;
  studentNameEn: string | null;
  studentPhone: string;
  courseTitle: string;
  courseTitleEn: string | null;
  courseSlug: string;
  scorePercent: number;
  durationHrs: number;
  issuedAt: string;
  revokedAt: string | null;
};

type QuestionDraft = {
  questionId?: string;
  prompt: string;
  promptEn: string;
  optA: string;
  optAEn: string;
  optB: string;
  optBEn: string;
  optC: string;
  optCEn: string;
  optD: string;
  optDEn: string;
  correctOptionId: "a" | "b" | "c" | "d";
  explanation: string;
  explanationEn: string;
  points: number;
};

const EMPTY_Q: QuestionDraft = {
  prompt: "",
  promptEn: "",
  optA: "",
  optAEn: "",
  optB: "",
  optBEn: "",
  optC: "",
  optCEn: "",
  optD: "",
  optDEn: "",
  correctOptionId: "a",
  explanation: "",
  explanationEn: "",
  points: 1,
};

export function ExamsManager({
  initialCourses,
  initialCertificates,
}: {
  initialCourses: AdminExamCourse[];
  initialCertificates: AdminCertificateItem[];
}) {
  const { lang } = useLang();
  const fa = lang === "fa";
  const { toast } = useToast();

  const [tab, setTab] = useState<"exams" | "certificates">("exams");
  const [courses, setCourses] = useState<AdminExamCourse[]>(initialCourses);
  const [certificates, setCertificates] =
    useState<AdminCertificateItem[]>(initialCertificates);

  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    initialCourses[0]?.id ?? "",
  );
  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) ?? courses[0] ?? null,
    [courses, selectedCourseId],
  );

  // Settings form state initialized from selectedCourse
  const [examForm, setExamForm] = useState(() => buildExamForm(selectedCourse));
  const [savingSettings, setSavingSettings] = useState(false);

  // Question modal/inline editor
  const [qEditorOpen, setQEditorOpen] = useState(false);
  const [qDraft, setQDraft] = useState<QuestionDraft>(EMPTY_Q);
  const [savingQ, setSavingQ] = useState(false);
  const [aiDrafting, setAiDrafting] = useState(false);

  // Certificates search & actions
  const [certSearch, setCertSearch] = useState("");
  const [busyCertId, setBusyCertId] = useState<string | null>(null);

  function buildExamForm(course: AdminExamCourse | null) {
    const ex = course?.exam;
    return {
      title: ex?.title ?? (course ? `آزمون پایان دوره ${course.title}` : ""),
      titleEn: ex?.titleEn ?? (course?.titleEn ? `${course.titleEn} Final Exam` : ""),
      description: ex?.description ?? "",
      descriptionEn: ex?.descriptionEn ?? "",
      passingScore: ex?.passingScore ?? 70,
      durationMins: ex?.durationMins ?? 20,
      maxAttempts: ex?.maxAttempts ?? 3,
      minProgressPercent: ex?.minProgressPercent ?? 70,
      requireCourseCompletion: ex?.requireCourseCompletion ?? true,
      isPublished: ex?.isPublished ?? true,
    };
  }

  function selectCourse(course: AdminExamCourse) {
    setSelectedCourseId(course.id);
    setExamForm(buildExamForm(course));
    setQEditorOpen(false);
  }

  async function reloadData() {
    const res = await fetch("/api/dashboard/exams/");
    if (!res.ok) return;
    const data = (await res.json()) as {
      courses: AdminExamCourse[];
      certificates: AdminCertificateItem[];
    };
    setCourses(data.courses);
    setCertificates(data.certificates);
    const updated = data.courses.find((c) => c.id === selectedCourseId);
    if (updated) setExamForm(buildExamForm(updated));
  }

  async function saveExamSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCourse) return;
    setSavingSettings(true);
    try {
      const res = await fetch("/api/dashboard/exams/", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourse.id,
          ...examForm,
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        toast({
          title: fa ? "خطا در ذخیره تنظیمات آزمون" : "Failed to save exam",
          description: err.error,
          variant: "destructive",
        });
        return;
      }
      await reloadData();
      toast({
        title: fa ? "تنظیمات آزمون ذخیره شد" : "Exam settings saved",
      });
    } finally {
      setSavingSettings(false);
    }
  }

  function openNewQuestion() {
    setQDraft(EMPTY_Q);
    setQEditorOpen(true);
  }

  function openEditQuestion(q: AdminExamQuestion) {
    const byId = new Map(q.options.map((o) => [o.id, o]));
    setQDraft({
      questionId: q.id,
      prompt: q.prompt,
      promptEn: q.promptEn ?? "",
      optA: byId.get("a")?.text ?? q.options[0]?.text ?? "",
      optAEn: byId.get("a")?.textEn ?? q.options[0]?.textEn ?? "",
      optB: byId.get("b")?.text ?? q.options[1]?.text ?? "",
      optBEn: byId.get("b")?.textEn ?? q.options[1]?.textEn ?? "",
      optC: byId.get("c")?.text ?? q.options[2]?.text ?? "",
      optCEn: byId.get("c")?.textEn ?? q.options[2]?.textEn ?? "",
      optD: byId.get("d")?.text ?? q.options[3]?.text ?? "",
      optDEn: byId.get("d")?.textEn ?? q.options[3]?.textEn ?? "",
      correctOptionId: (["a", "b", "c", "d"].includes(q.correctOptionId)
        ? q.correctOptionId
        : "a") as "a" | "b" | "c" | "d",
      explanation: q.explanation,
      explanationEn: q.explanationEn,
      points: q.points,
    });
    setQEditorOpen(true);
  }

  async function draftWithAI() {
    if (!selectedCourse) return;
    setAiDrafting(true);
    try {
      const res = await fetch("/api/dashboard/exams/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-ai",
          courseId: selectedCourse.id,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        draft?: {
          prompt?: string;
          promptEn?: string;
          options?: Array<{ id?: string; text?: string; textEn?: string }>;
          correctOptionId?: string;
          explanation?: string;
          explanationEn?: string;
        };
        error?: string;
      };
      if (!res.ok || !json.draft) {
        toast({
          title: fa ? "پیشنهاد سوال با خطا مواجه شد" : "AI question generation failed",
          description: json.error,
          variant: "destructive",
        });
        return;
      }
      const d = json.draft;
      const opts = Array.isArray(d.options) ? d.options : [];
      setQDraft({
        prompt: String(d.prompt ?? ""),
        promptEn: String(d.promptEn ?? ""),
        optA: String(opts[0]?.text ?? ""),
        optAEn: String(opts[0]?.textEn ?? ""),
        optB: String(opts[1]?.text ?? ""),
        optBEn: String(opts[1]?.textEn ?? ""),
        optC: String(opts[2]?.text ?? ""),
        optCEn: String(opts[2]?.textEn ?? ""),
        optD: String(opts[3]?.text ?? ""),
        optDEn: String(opts[3]?.textEn ?? ""),
        correctOptionId: (["a", "b", "c", "d"].includes(String(d.correctOptionId))
          ? d.correctOptionId
          : "a") as "a" | "b" | "c" | "d",
        explanation: String(d.explanation ?? ""),
        explanationEn: String(d.explanationEn ?? ""),
        points: 1,
      });
      setQEditorOpen(true);
      toast({
        title: fa ? "سوال پیشنهادی آماده ویرایش است" : "AI question draft ready",
      });
    } finally {
      setAiDrafting(false);
    }
  }

  async function saveQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCourse?.exam) {
      toast({
        title: fa ? "ابتدا تنظیمات آزمون را ذخیره کنید" : "Save exam settings first",
        variant: "destructive",
      });
      return;
    }
    setSavingQ(true);
    try {
      const options = [
        { id: "a", text: qDraft.optA.trim(), textEn: qDraft.optAEn.trim() || undefined },
        { id: "b", text: qDraft.optB.trim(), textEn: qDraft.optBEn.trim() || undefined },
        { id: "c", text: qDraft.optC.trim(), textEn: qDraft.optCEn.trim() || undefined },
        { id: "d", text: qDraft.optD.trim(), textEn: qDraft.optDEn.trim() || undefined },
      ].filter((o) => o.text.length > 0);

      const res = await fetch("/api/dashboard/exams/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-question",
          examId: selectedCourse.exam.id,
          questionId: qDraft.questionId,
          prompt: qDraft.prompt,
          promptEn: qDraft.promptEn,
          options,
          correctOptionId: qDraft.correctOptionId,
          explanation: qDraft.explanation,
          explanationEn: qDraft.explanationEn,
          points: qDraft.points,
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        toast({
          title: fa ? "خطا در ذخیره سوال" : "Failed to save question",
          description: err.error,
          variant: "destructive",
        });
        return;
      }
      await reloadData();
      setQEditorOpen(false);
      toast({ title: fa ? "سوال ذخیره شد" : "Question saved" });
    } finally {
      setSavingQ(false);
    }
  }

  async function deleteQuestion(questionId: string) {
    const res = await fetch("/api/dashboard/exams/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-question", questionId }),
    });
    if (res.ok) {
      await reloadData();
      toast({ title: fa ? "سوال حذف شد" : "Question deleted" });
    }
  }

  async function toggleCertificateRevoke(cert: AdminCertificateItem) {
    setBusyCertId(cert.id);
    try {
      const res = await fetch("/api/dashboard/certificates/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          certificateId: cert.id,
          revoked: !cert.revokedAt,
        }),
      });
      if (res.ok) {
        await reloadData();
        toast({
          title: cert.revokedAt
            ? fa
              ? "گواهینامه دوباره فعال شد"
              : "Certificate restored"
            : fa
              ? "گواهینامه ابطال شد"
              : "Certificate revoked",
        });
      }
    } finally {
      setBusyCertId(null);
    }
  }

  const filteredCertificates = useMemo(() => {
    const q = certSearch.trim().toLowerCase();
    if (!q) return certificates;
    return certificates.filter((c) =>
      [c.certificateCode, c.studentName, c.studentPhone, c.courseTitle]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [certificates, certSearch]);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setTab("exams")}
          className={`inline-flex min-h-[40px] items-center gap-2 rounded-md px-4 text-xs font-medium transition-colors ${
            tab === "exams"
              ? "bg-foreground text-background"
              : "border border-border bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>{fa ? "آزمون‌های پایان دوره" : "Course Final Exams"}</span>
          <span className="tabular-nums opacity-75">({localeNumber(lang, courses.length)})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab("certificates")}
          className={`inline-flex min-h-[40px] items-center gap-2 rounded-md px-4 text-xs font-medium transition-colors ${
            tab === "certificates"
              ? "bg-foreground text-background"
              : "border border-border bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          <Award className="size-3.5" />
          <span>{fa ? "گواهینامه‌های صادرشده" : "Issued Certificates"}</span>
          <span className="tabular-nums opacity-75">
            ({localeNumber(lang, certificates.length)})
          </span>
        </button>
      </div>

      {/* TAB 1: EXAMS EDITOR */}
      {tab === "exams" && (
        <div className="grid lg:grid-cols-[290px_1fr] gap-6">
          {/* Course List */}
          <aside className="rounded-lg border border-border bg-card overflow-hidden self-start">
            <div className="px-4 py-3 border-b border-border text-xs font-medium text-muted-foreground">
              {fa ? "انتخاب دوره" : "Select Course"}
            </div>
            <ul className="divide-y divide-border max-h-[600px] overflow-y-auto">
              {courses.map((c) => {
                const active = selectedCourse?.id === c.id;
                const qCount = c.exam?.questions.length ?? 0;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => selectCourse(c)}
                      className={`w-full text-start px-4 py-3 transition-colors ${
                        active ? "bg-secondary text-foreground" : "hover:bg-secondary/40"
                      }`}
                    >
                      <div className="text-sm font-medium truncate">
                        {fa ? c.title : c.titleEn || c.title}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
                        <span>
                          {localeNumber(lang, qCount)} {fa ? "سوال" : "questions"}
                        </span>
                        <span className={c.exam?.isPublished ? "text-emerald-700" : ""}>
                          {c.exam?.isPublished
                            ? fa
                              ? "فعال"
                              : "Published"
                            : fa
                              ? "پیش‌نویس"
                              : "Draft"}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* Exam Settings + Question Bank */}
          {selectedCourse && (
            <div className="space-y-6 min-w-0">
              <form
                onSubmit={saveExamSettings}
                className="rounded-lg border border-border bg-card p-5 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                  <div>
                    <h2 className="text-base font-semibold">
                      {fa ? selectedCourse.title : selectedCourse.titleEn || selectedCourse.title}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                      {fa ? "تعداد آزمون‌های داده‌شده:" : "Attempts:"}{" "}
                      {localeNumber(lang, selectedCourse.exam?.attemptsCount ?? 0)} ·{" "}
                      {fa ? "گواهینامه‌ها:" : "Certificates:"}{" "}
                      {localeNumber(lang, selectedCourse.exam?.certificatesCount ?? 0)}
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={examForm.isPublished}
                      onChange={(e) =>
                        setExamForm((f) => ({ ...f, isPublished: e.target.checked }))
                      }
                      className="size-4 accent-foreground"
                    />
                    <span>{fa ? "آزمون برای هنرجویان فعال باشد" : "Exam published"}</span>
                  </label>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <label className="text-xs text-muted-foreground">{fa ? "عنوان آزمون (فارسی)" : "Title (FA)"}</label>
                    <input
                      required
                      value={examForm.title}
                      onChange={(e) => setExamForm((f) => ({ ...f, title: e.target.value }))}
                      className="min-h-[40px] rounded-md border border-border bg-background px-3 text-xs outline-none"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-xs text-muted-foreground">{fa ? "عنوان انگلیسی (برای گواهینامه)" : "Title (EN)"}</label>
                    <input
                      dir="ltr"
                      value={examForm.titleEn}
                      onChange={(e) => setExamForm((f) => ({ ...f, titleEn: e.target.value }))}
                      className="min-h-[40px] rounded-md border border-border bg-background px-3 text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="grid gap-1.5">
                    <label className="text-xs text-muted-foreground">{fa ? "حدنصاب قبولی (٪)" : "Passing Score (%)"}</label>
                    <input
                      type="number"
                      min={40}
                      max={100}
                      value={examForm.passingScore}
                      onChange={(e) =>
                        setExamForm((f) => ({ ...f, passingScore: Number(e.target.value) }))
                      }
                      className="min-h-[40px] rounded-md border border-border bg-background px-3 text-xs tabular-nums outline-none"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-xs text-muted-foreground">{fa ? "زمان آزمون (دقیقه)" : "Duration (min)"}</label>
                    <input
                      type="number"
                      min={5}
                      max={180}
                      value={examForm.durationMins}
                      onChange={(e) =>
                        setExamForm((f) => ({ ...f, durationMins: Number(e.target.value) }))
                      }
                      className="min-h-[40px] rounded-md border border-border bg-background px-3 text-xs tabular-nums outline-none"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-xs text-muted-foreground">{fa ? "حداکثر دفعات مجاز" : "Max Attempts"}</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={examForm.maxAttempts}
                      onChange={(e) =>
                        setExamForm((f) => ({ ...f, maxAttempts: Number(e.target.value) }))
                      }
                      className="min-h-[40px] rounded-md border border-border bg-background px-3 text-xs tabular-nums outline-none"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-xs text-muted-foreground">{fa ? "حداقل پیشرفت گانت (٪)" : "Min Gantt Progress (%)"}</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={examForm.minProgressPercent}
                      onChange={(e) =>
                        setExamForm((f) => ({
                          ...f,
                          minProgressPercent: Number(e.target.value),
                        }))
                      }
                      className="min-h-[40px] rounded-md border border-border bg-background px-3 text-xs tabular-nums outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={examForm.requireCourseCompletion}
                      onChange={(e) =>
                        setExamForm((f) => ({
                          ...f,
                          requireCourseCompletion: e.target.checked,
                        }))
                      }
                      className="size-4 accent-foreground"
                    />
                    <span>
                      {fa
                        ? "شرط پیشرفت گانت الزامی باشد (مدیر همیشه می‌تواند دستی قفل را باز کند)"
                        : "Require Gantt progress threshold unless unlocked by admin"}
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md bg-foreground text-background px-4 text-xs font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {savingSettings ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Save className="size-3.5" />
                    )}
                    <span>{fa ? "ذخیره تنظیمات آزمون" : "Save Settings"}</span>
                  </button>
                </div>
              </form>

              {/* Question Bank */}
              <div className="rounded-lg border border-border bg-card p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">
                      {fa ? "بانک سوالات آزمون" : "Exam Question Bank"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fa
                        ? "سوالات فقط پیش از ارسال به هنرجو بدون کلید پاسخ ارسال می‌شوند و تصحیح کاملاً سمت سرور انجام می‌شود."
                        : "Correct options are stripped before sending to students and graded canonically on the server."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={aiDrafting}
                      onClick={() => void draftWithAI()}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-3 text-xs font-medium hover:bg-secondary disabled:opacity-50"
                    >
                      {aiDrafting ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="size-3.5" />
                      )}
                      <span>{fa ? "پیشنهاد سوال با هوش مصنوعی" : "Draft Question with AI"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={openNewQuestion}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md bg-foreground text-background px-3.5 text-xs font-medium hover:opacity-90"
                    >
                      <Plus className="size-3.5" />
                      <span>{fa ? "افزودن سوال دستی" : "Add Question"}</span>
                    </button>
                  </div>
                </div>

                {/* Inline Question Editor */}
                {qEditorOpen && (
                  <form
                    onSubmit={saveQuestion}
                    className="rounded-md border border-foreground/25 bg-secondary/20 p-4 space-y-3"
                  >
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="grid gap-1">
                        <label className="text-xs text-muted-foreground">{fa ? "متن سوال (فارسی)" : "Prompt (FA)"}</label>
                        <textarea
                          required
                          rows={2}
                          value={qDraft.prompt}
                          onChange={(e) => setQDraft((d) => ({ ...d, prompt: e.target.value }))}
                          className="rounded-md border border-border bg-background p-2.5 text-xs outline-none"
                        />
                      </div>
                      <div className="grid gap-1">
                        <label className="text-xs text-muted-foreground">{fa ? "متن سوال (انگلیسی)" : "Prompt (EN)"}</label>
                        <textarea
                          rows={2}
                          dir="ltr"
                          value={qDraft.promptEn}
                          onChange={(e) => setQDraft((d) => ({ ...d, promptEn: e.target.value }))}
                          className="rounded-md border border-border bg-background p-2.5 text-xs outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      {(
                        [
                          { id: "a", keyFa: "optA", keyEn: "optAEn" },
                          { id: "b", keyFa: "optB", keyEn: "optBEn" },
                          { id: "c", keyFa: "optC", keyEn: "optCEn" },
                          { id: "d", keyFa: "optD", keyEn: "optDEn" },
                        ] as const
                      ).map((opt) => (
                        <div
                          key={opt.id}
                          className={`rounded-md border p-2.5 space-y-1.5 ${
                            qDraft.correctOptionId === opt.id
                              ? "border-emerald-600 bg-emerald-50/40"
                              : "border-border bg-background"
                          }`}
                        >
                          <label className="flex items-center justify-between text-[11px] font-medium cursor-pointer">
                            <span>
                              {fa ? `گزینه ${opt.id.toUpperCase()}` : `Option ${opt.id.toUpperCase()}`}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <input
                                type="radio"
                                name="correctOption"
                                checked={qDraft.correctOptionId === opt.id}
                                onChange={() =>
                                  setQDraft((d) => ({ ...d, correctOptionId: opt.id }))
                                }
                              />
                              <span>{fa ? "پاسخ صحیح" : "Correct"}</span>
                            </span>
                          </label>
                          <input
                            required={opt.id === "a" || opt.id === "b"}
                            value={qDraft[opt.keyFa]}
                            onChange={(e) =>
                              setQDraft((d) => ({ ...d, [opt.keyFa]: e.target.value }))
                            }
                            placeholder={fa ? "متن فارسی گزینه..." : "Persian text..."}
                            className="w-full rounded border border-border px-2.5 py-1.5 text-xs outline-none"
                          />
                          <input
                            dir="ltr"
                            value={qDraft[opt.keyEn]}
                            onChange={(e) =>
                              setQDraft((d) => ({ ...d, [opt.keyEn]: e.target.value }))
                            }
                            placeholder="English option..."
                            className="w-full rounded border border-border px-2.5 py-1.5 text-xs outline-none"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="grid sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2 grid gap-1">
                        <label className="text-xs text-muted-foreground">
                          {fa ? "توضیح آموزشی پس از پاسخ" : "Explanation after submission"}
                        </label>
                        <input
                          value={qDraft.explanation}
                          onChange={(e) =>
                            setQDraft((d) => ({ ...d, explanation: e.target.value }))
                          }
                          className="min-h-[38px] rounded-md border border-border bg-background px-3 text-xs outline-none"
                        />
                      </div>
                      <div className="grid gap-1">
                        <label className="text-xs text-muted-foreground">{fa ? "بارم امتیاز" : "Points"}</label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={qDraft.points}
                          onChange={(e) =>
                            setQDraft((d) => ({ ...d, points: Number(e.target.value) }))
                          }
                          className="min-h-[38px] rounded-md border border-border bg-background px-3 text-xs tabular-nums outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setQEditorOpen(false)}
                        className="min-h-[36px] rounded-md border border-border px-3 text-xs hover:bg-secondary"
                      >
                        {fa ? "انصراف" : "Cancel"}
                      </button>
                      <button
                        type="submit"
                        disabled={savingQ}
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md bg-foreground text-background px-4 text-xs font-medium disabled:opacity-50"
                      >
                        {savingQ && <Loader2 className="size-3.5 animate-spin" />}
                        <span>{fa ? "ذخیره سوال" : "Save Question"}</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Questions List */}
                {(selectedCourse.exam?.questions.length ?? 0) === 0 ? (
                  <div className="py-10 text-center text-xs text-muted-foreground border border-dashed border-border rounded-md">
                    {fa ? "هنوز سوالی برای این آزمون ثبت نشده است." : "No questions yet."}
                  </div>
                ) : (
                  <ul className="divide-y divide-border border border-border rounded-md">
                    {selectedCourse.exam!.questions.map((q, idx) => (
                      <li key={q.id} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-sm font-medium">
                            <span className="text-muted-foreground me-2 tabular-nums">
                              {localeNumber(lang, idx + 1)}.
                            </span>
                            {fa ? q.prompt : q.promptEn || q.prompt}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => openEditQuestion(q)}
                              className="flex size-8 items-center justify-center rounded border border-border hover:bg-secondary"
                              title={fa ? "ویرایش" : "Edit"}
                            >
                              <Edit3 className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteQuestion(q.id)}
                              className="flex size-8 items-center justify-center rounded border border-border text-destructive hover:bg-destructive/5"
                              title={fa ? "حذف" : "Delete"}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-1.5 text-xs">
                          {q.options.map((opt) => (
                            <div
                              key={opt.id}
                              className={`rounded px-2.5 py-1.5 border ${
                                opt.id === q.correctOptionId
                                  ? "border-emerald-300 bg-emerald-50/70 text-emerald-900 font-medium"
                                  : "border-border/70 text-muted-foreground"
                              }`}
                            >
                              <span className="uppercase font-mono me-1.5">{opt.id})</span>
                              {fa ? opt.text : opt.textEn || opt.text}
                            </div>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ISSUED CERTIFICATES */}
      {tab === "certificates" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 max-w-md rounded-md border border-border bg-card px-3">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <input
              value={certSearch}
              onChange={(e) => setCertSearch(e.target.value)}
              placeholder={fa ? "جستجو با کد گواهینامه، نام هنرجو یا دوره..." : "Search serial, student, or course..."}
              className="w-full min-h-[40px] bg-transparent text-xs outline-none"
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-xs">
              <thead className="border-b border-border bg-secondary/30 text-muted-foreground">
                <tr>
                  <th className="py-3 px-4 text-start font-medium">{fa ? "کد گواهینامه" : "Certificate Code"}</th>
                  <th className="py-3 px-4 text-start font-medium">{fa ? "هنرجو" : "Student"}</th>
                  <th className="py-3 px-4 text-start font-medium">{fa ? "دوره" : "Course"}</th>
                  <th className="py-3 px-4 text-start font-medium">{fa ? "نمره" : "Score"}</th>
                  <th className="py-3 px-4 text-start font-medium">{fa ? "تاریخ صدور" : "Issued"}</th>
                  <th className="py-3 px-4 text-start font-medium">{fa ? "وضعیت" : "Status"}</th>
                  <th className="py-3 px-4 text-end font-medium">{fa ? "اقدام" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCertificates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted-foreground">
                      {fa ? "هنوز گواهینامه‌ای صادر نشده است." : "No certificates issued yet."}
                    </td>
                  </tr>
                ) : (
                  filteredCertificates.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3 px-4 font-mono" dir="ltr">
                        {c.certificateCode}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium">{c.studentName}</div>
                        <div className="text-[11px] text-muted-foreground" dir="ltr">
                          {c.studentPhone}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {fa ? c.courseTitle : c.courseTitleEn || c.courseTitle}
                      </td>
                      <td className="py-3 px-4 tabular-nums font-medium">
                        {localeNumber(lang, c.scorePercent)}
                        {fa ? "٪" : "%"}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground tabular-nums">
                        {localeDate(lang, c.issuedAt)}
                      </td>
                      <td className="py-3 px-4">
                        {c.revokedAt ? (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-medium">
                            <XCircle className="size-3.5" />
                            <span>{fa ? "باطل‌شده" : "Revoked"}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <CheckCircle2 className="size-3.5" />
                            <span>{fa ? "معتبر" : "Valid"}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-end">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            href={`/certificates/${encodeURIComponent(c.certificateCode)}/`}
                            target="_blank"
                            className="inline-flex min-h-[32px] items-center gap-1 rounded border border-border px-2.5 hover:bg-secondary"
                          >
                            <span>{fa ? "مشاهده" : "View"}</span>
                            <ExternalLink className="size-3" />
                          </Link>
                          <button
                            type="button"
                            disabled={busyCertId === c.id}
                            onClick={() => void toggleCertificateRevoke(c)}
                            className="inline-flex min-h-[32px] items-center gap-1 rounded border border-border px-2.5 hover:bg-secondary disabled:opacity-50"
                          >
                            {busyCertId === c.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <RotateCcw className="size-3" />
                            )}
                            <span>
                              {c.revokedAt
                                ? fa
                                  ? "احیا"
                                  : "Restore"
                                : fa
                                  ? "ابطال"
                                  : "Revoke"}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
