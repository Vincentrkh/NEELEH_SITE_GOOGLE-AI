"use client";

import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/components/language-provider";
import { localeNumber, toFaDigits } from "@/lib/format";
import {
  formatSessionLabel,
  type AttendanceStatus,
  type GanttData,
  type GanttDayCell,
} from "@/lib/attendance-gantt";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Lock,
  CalendarDays,
  Loader2,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

type Mode = "student" | "admin";

const STATUS_STYLE: Record<
  AttendanceStatus,
  {
    cellClass: string;
    swatchClass: string;
    labelFa: string;
    labelEn: string;
    textClass: string;
  }
> = {
  SCHEDULED: {
    cellClass: "bg-secondary border-border hover:border-foreground/60",
    swatchClass: "bg-secondary border-border",
    labelFa: "جلسه پیشِ‌رو",
    labelEn: "Upcoming",
    textClass: "text-muted-foreground",
  },
  AUTO_PRESENT: {
    cellClass: "bg-emerald-400/80 border-emerald-500/80 hover:border-emerald-700",
    swatchClass: "bg-emerald-400/80 border-emerald-500/80",
    labelFa: "تکمیل خودکار (حاضر)",
    labelEn: "Auto-completed",
    textClass: "text-emerald-700",
  },
  PRESENT: {
    cellClass: "bg-emerald-600 border-emerald-700 hover:border-emerald-900",
    swatchClass: "bg-emerald-600 border-emerald-700",
    labelFa: "حضور تاییدشده",
    labelEn: "Verified present",
    textClass: "text-emerald-700",
  },
  DECLARED_ABSENCE: {
    cellClass: "bg-amber-400 border-amber-500 hover:border-amber-700",
    swatchClass: "bg-amber-400 border-amber-500",
    labelFa: "غیبت اعلام‌شده (قفل برای هنرجو)",
    labelEn: "Declared absence (locked)",
    textClass: "text-amber-700",
  },
  ABSENT: {
    cellClass: "bg-rose-500 border-rose-600 hover:border-rose-800",
    swatchClass: "bg-rose-500 border-rose-600",
    labelFa: "غیبت ثبت‌شده توسط مدیر",
    labelEn: "Marked absent",
    textClass: "text-rose-700",
  },
  CANCELLED_LEAVE: {
    cellClass: "bg-sky-500/80 border-sky-600 hover:border-sky-800",
    swatchClass: "bg-sky-500/80 border-sky-600",
    labelFa: "لغو غیبت توسط مدیر",
    labelEn: "Leave cancelled by admin",
    textClass: "text-sky-700",
  },
};

const WEEKDAY_ROWS_FA = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
const WEEKDAY_ROWS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AttendanceGantt({
  initialGantt,
  mode,
  courseTitle,
  onGanttChange,
}: {
  initialGantt: GanttData;
  mode: Mode;
  courseTitle?: string;
  onGanttChange?: (next: GanttData) => void;
}) {
  const { lang } = useLang();
  const fa = lang === "fa";
  const { toast } = useToast();

  const [gantt, setGantt] = useState<GanttData>(initialGantt);
  const [selectedKey, setSelectedKey] = useState<string | null>(() => {
    const todayOrNext = initialGantt.scheduledDays.find(
      (d) => d.dateKey >= initialGantt.tehranTodayKey,
    );
    return todayOrNext?.dateKey ?? initialGantt.scheduledDays[0]?.dateKey ?? null;
  });
  const [hoveredCell, setHoveredCell] = useState<GanttDayCell | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [busy, setBusy] = useState(false);

  // Admin schedule tuning panel
  const [showSettings, setShowSettings] = useState(false);
  const [startDateInput, setStartDateInput] = useState(initialGantt.scheduleStartDateKey);
  const [sessionsPerWeekInput, setSessionsPerWeekInput] = useState(
    String(initialGantt.stats.sessionsPerWeek),
  );
  const [sessionHoursInput, setSessionHoursInput] = useState(
    String(initialGantt.stats.sessionHours),
  );
  const [autoAttendanceInput, setAutoAttendanceInput] = useState(initialGantt.autoAttendance);

  const selectedCell = useMemo(() => {
    if (!selectedKey) return null;
    return gantt.scheduledDays.find((d) => d.dateKey === selectedKey) ?? null;
  }, [gantt.scheduledDays, selectedKey]);

  const activeInspectCell = hoveredCell?.isScheduled ? hoveredCell : selectedCell;
  const weekdayLabels = fa ? WEEKDAY_ROWS_FA : WEEKDAY_ROWS_EN;

  function applyUpdate(next: GanttData) {
    setGantt(next);
    setStartDateInput(next.scheduleStartDateKey);
    setSessionsPerWeekInput(String(next.stats.sessionsPerWeek));
    setSessionHoursInput(String(next.stats.sessionHours));
    setAutoAttendanceInput(next.autoAttendance);
    onGanttChange?.(next);
  }

  async function declareStudentAbsence() {
    if (!selectedCell || !selectedCell.canStudentDeclareAbsence) return;
    setBusy(true);
    try {
      const res = await fetch("/api/panel/gantt/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId: gantt.registrationId,
          dateKey: selectedCell.dateKey,
          note: noteInput,
        }),
      });
      const data = (await res.json()) as { error?: string; gantt?: GanttData };
      if (!res.ok) {
        toast({
          title: fa ? "ثبت انجام نشد" : "Could not declare absence",
          description: data.error,
          variant: "destructive",
        });
        return;
      }
      if (data.gantt) applyUpdate(data.gantt);
      setNoteInput("");
      toast({
        title: fa ? "اعلام غیبت ثبت شد" : "Absence declared",
        description: fa
          ? "این روز قفل شد و لغو آن فقط توسط مدیر امکان‌پذیر است."
          : "This day is now locked; only an administrator can cancel it.",
      });
    } catch {
      toast({
        title: fa ? "خطا" : "Error",
        description: fa ? "ارتباط برقرار نشد" : "Connection failed",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function runAdminAction(
    action: "MARK_PRESENT" | "MARK_ABSENT" | "CANCEL_LEAVE" | "RESET_SCHEDULED",
  ) {
    if (!selectedCell) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/dashboard/registrations/${gantt.registrationId}/gantt/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          dateKey: selectedCell.dateKey,
          adminNote: noteInput,
        }),
      });
      const data = (await res.json()) as { error?: string; gantt?: GanttData };
      if (!res.ok) {
        toast({ title: fa ? "خطا" : "Error", description: data.error, variant: "destructive" });
        return;
      }
      if (data.gantt) applyUpdate(data.gantt);
      setNoteInput("");
      toast({ title: fa ? "وضعیت جلسه به‌روزرسانی شد" : "Attendance updated" });
    } catch {
      toast({
        title: fa ? "خطا" : "Error",
        description: fa ? "ارتباط برقرار نشد" : "Connection failed",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function saveAdminScheduleSettings(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/api/dashboard/registrations/${gantt.registrationId}/gantt/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_SETTINGS",
          scheduleStartDate: startDateInput,
          sessionsPerWeek: Number(sessionsPerWeekInput),
          sessionHours: Number(sessionHoursInput),
          autoAttendance: autoAttendanceInput,
        }),
      });
      const data = (await res.json()) as { error?: string; gantt?: GanttData };
      if (!res.ok) {
        toast({ title: fa ? "خطا" : "Error", description: data.error, variant: "destructive" });
        return;
      }
      if (data.gantt) applyUpdate(data.gantt);
      setShowSettings(false);
      toast({ title: fa ? "زمان‌بندی دوره ذخیره شد" : "Schedule updated" });
    } catch {
      toast({
        title: fa ? "خطا" : "Error",
        description: fa ? "ارتباط برقرار نشد" : "Connection failed",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 sm:p-5 space-y-4">
      {/* Top Progress Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium text-foreground">
            <CalendarDays className="size-3.5 text-muted-foreground shrink-0" aria-hidden />
            <span>
              {fa ? "گانت پیشرفت و حضور و غیاب دوره" : "Course Progress & Attendance Gantt"}
            </span>
            {courseTitle && (
              <>
                <span className="text-muted-foreground" aria-hidden>·</span>
                <span className="text-muted-foreground truncate">{courseTitle}</span>
              </>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground tabular-nums">
            <span>
              {localeNumber(lang, gantt.stats.completedSessions)}/{localeNumber(lang, gantt.stats.totalSessions)}{" "}
              {fa ? "جلسه" : "sessions"}
            </span>
            <span aria-hidden>·</span>
            <span>
              {localeNumber(lang, gantt.stats.completedHrs)}/{localeNumber(lang, gantt.stats.durationHrs)}{" "}
              {fa ? "ساعت" : "hrs"}
            </span>
            <span aria-hidden>·</span>
            <span className="font-medium text-foreground">
              {localeNumber(lang, gantt.stats.progressPercent)}
              {fa ? "٪ پیشرفت" : "% progress"}
            </span>
            {gantt.stats.attendanceRatePercent !== null && (
              <>
                <span aria-hidden>·</span>
                <span>
                  {fa ? "نرخ حضور:" : "Attendance:"} {localeNumber(lang, gantt.stats.attendanceRatePercent)}
                  {fa ? "٪" : "%"}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {gantt.autoAttendance && (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 border border-emerald-500/30 bg-emerald-50 px-2 py-1 rounded-md whitespace-nowrap shrink-0">
              <ShieldCheck className="size-3.5" aria-hidden />
              {fa ? "تکمیل خودکار فعال" : "Auto-attendance"}
            </span>
          )}
          {mode === "admin" && (
            <button
              type="button"
              onClick={() => setShowSettings((s) => !s)}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-md border border-border px-2.5 text-xs hover:bg-secondary transition-colors whitespace-nowrap shrink-0"
            >
              <SlidersHorizontal className="size-3.5" aria-hidden />
              <span>{fa ? "تنظیم برنامه" : "Schedule"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full rounded-sm bg-secondary overflow-hidden">
        <div
          className="h-full bg-emerald-600 transition-all duration-300"
          style={{ width: `${gantt.stats.progressPercent}%` }}
        />
      </div>

      {/* Admin Schedule Settings Drawer */}
      {mode === "admin" && showSettings && (
        <form
          onSubmit={saveAdminScheduleSettings}
          className="rounded-md border border-border bg-secondary/20 p-3.5 grid sm:grid-cols-4 gap-3 items-end"
        >
          <div className="grid gap-1">
            <label className="text-[11px] text-muted-foreground">
              {fa ? "تاریخ شروع برنامه" : "Start date"}
            </label>
            <input
              type="date"
              dir="ltr"
              value={startDateInput}
              onChange={(e) => setStartDateInput(e.target.value)}
              className="bg-background border border-border rounded-md px-2.5 py-1.5 text-xs min-h-[36px]"
            />
          </div>
          <div className="grid gap-1">
            <label className="text-[11px] text-muted-foreground">
              {fa ? "جلسه در هفته" : "Sessions / week"}
            </label>
            <select
              value={sessionsPerWeekInput}
              onChange={(e) => setSessionsPerWeekInput(e.target.value)}
              className="bg-background border border-border rounded-md px-2.5 py-1.5 text-xs min-h-[36px]"
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {localeNumber(lang, n)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1">
            <label className="text-[11px] text-muted-foreground">
              {fa ? "ساعت هر جلسه" : "Hours / session"}
            </label>
            <input
              type="number"
              min={1}
              max={12}
              step={0.5}
              dir="ltr"
              value={sessionHoursInput}
              onChange={(e) => setSessionHoursInput(e.target.value)}
              className="bg-background border border-border rounded-md px-2.5 py-1.5 text-xs min-h-[36px]"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={autoAttendanceInput}
                onChange={(e) => setAutoAttendanceInput(e.target.checked)}
                className="rounded border-border"
              />
              <span>{fa ? "خودکار" : "Auto"}</span>
            </label>
            <button
              type="submit"
              disabled={busy}
              className="min-h-[36px] rounded-md bg-foreground text-background px-3 text-xs font-medium hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
            >
              {fa ? "ذخیره" : "Save"}
            </button>
          </div>
        </form>
      )}

      {/* GitHub-Style Matrix */}
      <div className="overflow-x-auto pb-1">
        <div className="inline-flex gap-2 items-start min-w-full">
          {/* Weekday Axis */}
          <div className="pt-5 flex flex-col gap-1 shrink-0">
            {weekdayLabels.map((wLabel, idx) => (
              <div
                key={idx}
                className="h-3.5 sm:h-4 flex items-center text-[10px] text-muted-foreground leading-none pe-1 select-none"
              >
                {wLabel}
              </div>
            ))}
          </div>

          {/* Weekly Columns */}
          <div className="flex gap-1">
            {gantt.weeks.map((week) => {
              const monthLabel = fa ? week.monthLabelFa : week.monthLabelEn;
              return (
                <div key={week.weekIndex} className="flex flex-col gap-1 shrink-0">
                  <div className="h-4 text-[10px] text-muted-foreground whitespace-nowrap leading-none flex items-center">
                    {monthLabel}
                  </div>
                  {week.cells.map((cell) => {
                    if (!cell.isScheduled || cell.status === "FILLER") {
                      return (
                        <div
                          key={cell.dateKey}
                          aria-hidden
                          className="size-3.5 sm:size-4 rounded-[3px] bg-secondary/35 border border-transparent opacity-40"
                        />
                      );
                    }

                    const st = STATUS_STYLE[cell.status];
                    const isSelected = selectedKey === cell.dateKey;
                    const sessionNumStr = cell.sessionIndex
                      ? formatSessionLabel(lang, cell.sessionIndex)
                      : "";
                    const titleText = `${sessionNumStr} · ${fa ? cell.jalaliFull : cell.gregorianFull} · ${fa ? st.labelFa : st.labelEn}`;

                    return (
                      <button
                        key={cell.dateKey}
                        type="button"
                        title={titleText}
                        aria-label={titleText}
                        onMouseEnter={() => setHoveredCell(cell)}
                        onMouseLeave={() => setHoveredCell(null)}
                        onClick={() => {
                          setSelectedKey(cell.dateKey);
                          setNoteInput("");
                        }}
                        className={`relative size-3.5 sm:size-4 rounded-[3px] border transition-transform hover:scale-110 focus:outline-none ${st.cellClass} ${
                          isSelected ? "ring-2 ring-foreground ring-offset-1 ring-offset-card z-10" : ""
                        } ${cell.isToday && !isSelected ? "ring-1 ring-foreground/60" : ""}`}
                      >
                        {cell.status === "DECLARED_ABSENCE" && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="size-1 rounded-full bg-amber-950/70" />
                          </span>
                        )}
                        {cell.status === "ABSENT" && (
                          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white leading-none">
                            ×
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Explicit Non-Hue-Only Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 border-t border-border text-[11px] text-muted-foreground">
        {(
          [
            "SCHEDULED",
            "AUTO_PRESENT",
            "PRESENT",
            "DECLARED_ABSENCE",
            "ABSENT",
            "CANCELLED_LEAVE",
          ] as AttendanceStatus[]
        ).map((key) => {
          const item = STATUS_STYLE[key];
          return (
            <div key={key} className="inline-flex items-center gap-1.5">
              <span className={`inline-block size-3 rounded-[2px] border ${item.swatchClass}`} />
              <span>{fa ? item.labelFa : item.labelEn}</span>
            </div>
          );
        })}
      </div>

      {/* Active Cell Details & Anti-Cheat Controls */}
      {activeInspectCell && activeInspectCell.status !== "FILLER" && (
        <div className="rounded-md border border-border bg-secondary/20 p-3.5 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                {activeInspectCell.sessionIndex && (
                  <span>{formatSessionLabel(lang, activeInspectCell.sessionIndex)}</span>
                )}
                {activeInspectCell.sessionTitle && (
                  <>
                    <span aria-hidden className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{activeInspectCell.sessionTitle}</span>
                  </>
                )}
                <span aria-hidden className="text-muted-foreground">·</span>
                <span className={STATUS_STYLE[activeInspectCell.status].textClass}>
                  {fa
                    ? STATUS_STYLE[activeInspectCell.status].labelFa
                    : STATUS_STYLE[activeInspectCell.status].labelEn}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {fa
                  ? `${activeInspectCell.jalaliFull} (${activeInspectCell.gregorianFull})`
                  : `${activeInspectCell.gregorianFull} (${activeInspectCell.jalaliFull})`}
              </div>
            </div>

            {activeInspectCell.lockedForStudent && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground border border-border bg-background px-2 py-0.5 rounded">
                <Lock className="size-3" aria-hidden />
                {fa ? "قفل‌شده برای هنرجو" : "Locked for student"}
              </span>
            )}
          </div>

          {activeInspectCell.studentNote && (
            <div className="text-xs rounded border border-border bg-background px-3 py-2">
              <span className="text-muted-foreground">
                {fa ? "توضیح هنرجو: " : "Student note: "}
              </span>
              <span>{activeInspectCell.studentNote}</span>
            </div>
          )}

          {activeInspectCell.adminNote && (
            <div className="text-xs rounded border border-border bg-background px-3 py-2">
              <span className="text-muted-foreground">
                {fa ? "یادداشت مدیر: " : "Admin note: "}
              </span>
              <span>{activeInspectCell.adminNote}</span>
            </div>
          )}

          {/* Student Interaction */}
          {mode === "student" && selectedCell?.dateKey === activeInspectCell.dateKey && (
            <div>
              {selectedCell.canStudentDeclareAbsence ? (
                <div className="space-y-2.5 pt-1">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      maxLength={250}
                      placeholder={
                        fa
                          ? "علت غیبت احتمالی (اختیاری — مثلاً امتحان دانشگاه)..."
                          : "Reason for planned absence (optional)..."
                      }
                      className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-xs outline-none focus:border-foreground min-h-[38px]"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={declareStudentAbsence}
                      className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-md bg-amber-600 text-white px-3.5 text-xs font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                      {busy ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <AlertTriangle className="size-3.5" />
                      )}
                      <span>{fa ? "اعلام غیبت برای این جلسه" : "Declare planned absence"}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {fa
                      ? "توجه: پس از اعلام غیبت، لغو یا تغییر آن فقط توسط مدیر آکادمی انجام می‌شود."
                      : "Note: Once declared, only the academy manager can cancel or modify an absence notice."}
                  </p>
                </div>
              ) : selectedCell.status === "DECLARED_ABSENCE" ? (
                <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  <Lock className="size-3.5 shrink-0" />
                  <span>
                    {fa
                      ? "اعلام غیبت شما ثبت و قفل شده است. برای لغو آن با مدیر هماهنگ کنید (لغو فقط با مدیر است)."
                      : "Your absence notice is locked. Contact an administrator to cancel it."}
                  </span>
                </div>
              ) : selectedCell.isPast ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="size-3.5 shrink-0" />
                  <span>
                    {fa
                      ? "تاریخ این جلسه گذشته است و وضعیت آن بر اساس حضور خودکار یا تایید مدیر نهایی شده است."
                      : "This session date has passed and is finalized."}
                  </span>
                </div>
              ) : gantt.registrationStatus !== "CONFIRMED" ? (
                <div className="text-xs text-amber-700">
                  {fa
                    ? "اعلام غیبت پس از تایید نهایی ثبت‌نام فعال می‌شود."
                    : "Absence notice activates once registration is confirmed."}
                </div>
              ) : null}
            </div>
          )}

          {/* Admin Controls */}
          {mode === "admin" && selectedCell?.dateKey === activeInspectCell.dateKey && (
            <div className="space-y-2.5 pt-1">
              <input
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                maxLength={400}
                placeholder={fa ? "یادداشت مدیر برای این جلسه (اختیاری)..." : "Admin note for this session (optional)..."}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs outline-none focus:border-foreground min-h-[38px]"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => runAdminAction("MARK_PRESENT")}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md bg-emerald-600 text-white px-3 text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap"
                >
                  <CheckCircle2 className="size-3.5" />
                  <span>{fa ? "ثبت حضور" : "Mark Present"}</span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => runAdminAction("MARK_ABSENT")}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md bg-rose-600 text-white px-3 text-xs font-medium hover:bg-rose-700 disabled:opacity-50 whitespace-nowrap"
                >
                  <XCircle className="size-3.5" />
                  <span>{fa ? "ثبت غیبت" : "Mark Absent"}</span>
                </button>
                {selectedCell.status === "DECLARED_ABSENCE" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => runAdminAction("CANCEL_LEAVE")}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md bg-sky-600 text-white px-3 text-xs font-medium hover:bg-sky-700 disabled:opacity-50 whitespace-nowrap"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>{fa ? "لغو غیبت ارسالی هنرجو" : "Cancel Student Leave"}</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => runAdminAction("RESET_SCHEDULED")}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs hover:bg-secondary disabled:opacity-50 whitespace-nowrap"
                >
                  <span>{fa ? "بازنشانی به خودکار" : "Reset"}</span>
                </button>
                {busy && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Compact Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs tabular-nums">
        <div className="rounded-md border border-border px-3 py-2 bg-background">
          <div className="text-muted-foreground text-[11px]">{fa ? "حاضر / خودکار" : "Present / Auto"}</div>
          <div className="font-medium mt-0.5 text-emerald-700">
            {localeNumber(lang, gantt.stats.presentCount + gantt.stats.autoPresentCount)}{" "}
            <span className="text-muted-foreground font-normal">
              ({fa ? `خودکار ${toFaDigits(gantt.stats.autoPresentCount)}` : `${gantt.stats.autoPresentCount} auto`})
            </span>
          </div>
        </div>
        <div className="rounded-md border border-border px-3 py-2 bg-background">
          <div className="text-muted-foreground text-[11px]">{fa ? "غیبت اعلام‌شده" : "Declared Absence"}</div>
          <div className="font-medium mt-0.5 text-amber-700">
            {localeNumber(lang, gantt.stats.declaredAbsenceCount)}
          </div>
        </div>
        <div className="rounded-md border border-border px-3 py-2 bg-background">
          <div className="text-muted-foreground text-[11px]">{fa ? "غیبت ثبت‌شده" : "Absent"}</div>
          <div className="font-medium mt-0.5 text-rose-700">
            {localeNumber(lang, gantt.stats.absentCount)}
          </div>
        </div>
        <div className="rounded-md border border-border px-3 py-2 bg-background">
          <div className="text-muted-foreground text-[11px]">{fa ? "جلسات باقی‌مانده" : "Remaining"}</div>
          <div className="font-medium mt-0.5">{localeNumber(lang, gantt.stats.upcomingCount)}</div>
        </div>
      </div>
    </div>
  );
}
