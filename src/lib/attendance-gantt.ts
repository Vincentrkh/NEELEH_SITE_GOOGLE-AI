import { toFaDigits } from "./format";

export type AttendanceStatus =
  | "SCHEDULED"
  | "AUTO_PRESENT"
  | "PRESENT"
  | "ABSENT"
  | "DECLARED_ABSENCE"
  | "CANCELLED_LEAVE";

export type PersistedAttendanceRow = {
  dateKey: string;
  sessionIndex: number;
  status: string;
  studentNote: string | null;
  adminNote: string | null;
  declaredAt: string | Date | null;
  reviewedById?: string | null;
  reviewedAt: string | Date | null;
  lockedForStudent: boolean;
};

export type GanttDayCell = {
  dateKey: string;
  isScheduled: boolean;
  sessionIndex: number | null;
  sessionTitle: string | null;
  status: AttendanceStatus | "FILLER";
  isPast: boolean;
  isToday: boolean;
  isFuture: boolean;
  canStudentDeclareAbsence: boolean;
  lockedForStudent: boolean;
  studentNote: string | null;
  adminNote: string | null;
  declaredAt: string | null;
  reviewedAt: string | null;
  jalaliShort: string;
  jalaliFull: string;
  gregorianShort: string;
  gregorianFull: string;
  weekdayIndex: number; // 0=Sun..6=Sat
};

export type GanttWeekColumn = {
  weekIndex: number;
  monthLabelFa: string;
  monthLabelEn: string;
  cells: GanttDayCell[]; // 7 cells ordered by row index
};

export type GanttStats = {
  totalSessions: number;
  sessionHours: number;
  sessionsPerWeek: number;
  durationHrs: number;
  completedSessions: number;
  completedHrs: number;
  presentCount: number;
  autoPresentCount: number;
  absentCount: number;
  declaredAbsenceCount: number;
  cancelledLeaveCount: number;
  upcomingCount: number;
  progressPercent: number;
  attendanceRatePercent: number | null;
};

export type GanttData = {
  registrationId: string;
  registrationStatus: string;
  autoAttendance: boolean;
  tehranTodayKey: string;
  scheduleStartDateKey: string;
  scheduleEndDateKey: string;
  weeks: GanttWeekColumn[];
  scheduledDays: GanttDayCell[];
  stats: GanttStats;
};

const TEHRAN_TZ = "Asia/Tehran";

/**
 * Server-canonical Tehran date (`YYYY-MM-DD`). Prevents client clock spoofing.
 */
export function getTehranTodayKey(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TEHRAN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value ?? "2026";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

export function dateToTehranKey(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return getTehranTodayKey();
  return getTehranTodayKey(dt);
}

export function isValidDateKey(dateKey: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false;
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** 0 = Sunday .. 6 = Saturday */
export function getWeekdayIndex(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
}

export function formatDateKeyLabels(dateKey: string): {
  jalaliShort: string;
  jalaliFull: string;
  gregorianShort: string;
  gregorianFull: string;
  jalaliMonth: string;
  gregorianMonth: string;
} {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const jalaliFull = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "UTC",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(dt);
  const jalaliShort = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(dt);
  const jalaliMonth = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "UTC",
    month: "short",
  }).format(dt);

  const gregorianFull = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(dt);
  const gregorianShort = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(dt);
  const gregorianMonth = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
  }).format(dt);

  return {
    jalaliShort,
    jalaliFull,
    gregorianShort,
    gregorianFull,
    jalaliMonth,
    gregorianMonth,
  };
}

/**
 * Returns preferred weekday indices (0=Sun..6=Sat) for Iranian weekly class cadence.
 * 6 = Saturday (شنبه), 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu. (Never Friday=5).
 */
function getCadenceWeekdays(sessionsPerWeek: number): number[] {
  const clamped = Math.max(1, Math.min(6, Math.round(sessionsPerWeek)));
  switch (clamped) {
    case 1:
      return [6]; // شنبه
    case 2:
      return [6, 2]; // شنبه و سه‌شنبه
    case 3:
      return [6, 1, 3]; // شنبه، دوشنبه، چهارشنبه
    case 4:
      return [6, 0, 2, 3]; // شنبه، یکشنبه، سه‌شنبه، چهارشنبه
    case 5:
      return [6, 0, 1, 2, 3]; // شنبه تا چهارشنبه
    case 6:
      return [6, 0, 1, 2, 3, 4]; // شنبه تا پنجشنبه
    default:
      return [6, 2];
  }
}

export type CourseScheduleSeed = {
  title: string;
  dateKey: string;
};

export function generateCourseScheduleDays(params: {
  durationHrs: number;
  sessionHours?: number | null;
  sessionsPerWeek?: number | null;
  startDate: Date | string;
  explicitSessions?: Array<{ title?: string; date?: Date | string | null; startAt?: Date | string | null }>;
}): Array<{ dateKey: string; sessionIndex: number; title: string | null }> {
  const durationHrs = Math.max(2, Number(params.durationHrs) || 24);
  const sessionHours = Math.max(1, Math.min(12, Number(params.sessionHours) || 2));
  const sessionsPerWeek = Math.max(1, Math.min(6, Number(params.sessionsPerWeek) || 2));
  const totalSessions = Math.max(1, Math.min(120, Math.ceil(durationHrs / sessionHours)));

  const startKey = dateToTehranKey(params.startDate);
  const result: Array<{ dateKey: string; sessionIndex: number; title: string | null }> = [];
  const usedKeys = new Set<string>();

  // Seed with explicit CourseSession dates if any exist in future/valid sequence
  const explicitSorted = (params.explicitSessions ?? [])
    .map((s) => {
      const dt = s.startAt ?? s.date;
      if (!dt) return null;
      return {
        dateKey: dateToTehranKey(dt),
        title: s.title?.trim() || null,
      };
    })
    .filter((x): x is { dateKey: string; title: string | null } => x !== null)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  // Only adopt explicit sessions if they are close to or after startKey (or if startDate wasn't custom)
  for (const s of explicitSorted) {
    if (result.length >= totalSessions) break;
    if (s.dateKey >= startKey && !usedKeys.has(s.dateKey)) {
      usedKeys.add(s.dateKey);
      result.push({
        dateKey: s.dateKey,
        sessionIndex: result.length + 1,
        title: s.title,
      });
    }
  }

  // Fill remaining sessions deterministically on cadence weekdays starting from last date or startKey
  const allowedWeekdays = new Set(getCadenceWeekdays(sessionsPerWeek));
  let cursorKey = result.length > 0 ? addDaysToDateKey(result[result.length - 1].dateKey, 1) : startKey;

  let guard = 0;
  while (result.length < totalSessions && guard < 730) {
    guard++;
    const wd = getWeekdayIndex(cursorKey);
    if (allowedWeekdays.has(wd) && !usedKeys.has(cursorKey)) {
      usedKeys.add(cursorKey);
      result.push({
        dateKey: cursorKey,
        sessionIndex: result.length + 1,
        title: explicitSorted[result.length]?.title ?? null,
      });
    }
    cursorKey = addDaysToDateKey(cursorKey, 1);
  }

  return result;
}

/**
 * Pure builder for GitHub-style weekly Gantt calendar + anti-cheat status rules.
 */
export function buildGanttCalendarMatrix(params: {
  registrationId: string;
  registrationStatus: string;
  autoAttendance: boolean;
  durationHrs: number;
  sessionHours?: number | null;
  sessionsPerWeek?: number | null;
  scheduleStartDate: Date | string;
  explicitSessions?: Array<{ title?: string; date?: Date | string | null; startAt?: Date | string | null }>;
  persistedRows: PersistedAttendanceRow[];
  tehranTodayKey?: string;
  lang?: "fa" | "en";
}): GanttData {
  const tehranTodayKey = params.tehranTodayKey ?? getTehranTodayKey();
  const durationHrs = Math.max(2, Number(params.durationHrs) || 24);
  const sessionHours = Math.max(1, Math.min(12, Number(params.sessionHours) || 2));
  const sessionsPerWeek = Math.max(1, Math.min(6, Number(params.sessionsPerWeek) || 2));
  const isConfirmed = params.registrationStatus === "CONFIRMED";

  const schedule = generateCourseScheduleDays({
    durationHrs,
    sessionHours,
    sessionsPerWeek,
    startDate: params.scheduleStartDate,
    explicitSessions: params.explicitSessions,
  });

  const persistedMap = new Map<string, PersistedAttendanceRow>();
  for (const row of params.persistedRows) {
    persistedMap.set(row.dateKey, row);
  }

  const scheduleMap = new Map<string, { sessionIndex: number; title: string | null }>();
  for (const s of schedule) {
    scheduleMap.set(s.dateKey, { sessionIndex: s.sessionIndex, title: s.title });
  }

  const firstScheduledKey = schedule[0]?.dateKey ?? dateToTehranKey(params.scheduleStartDate);
  const lastScheduledKey = schedule[schedule.length - 1]?.dateKey ?? firstScheduledKey;

  // Align matrix to week start: Saturday (6) for FA, Sunday (0) for EN
  const startOfWeekWeekday = params.lang === "en" ? 0 : 6;
  const firstWd = getWeekdayIndex(firstScheduledKey);
  const leadBackDays = (firstWd - startOfWeekWeekday + 7) % 7;
  const gridStartKey = addDaysToDateKey(firstScheduledKey, -leadBackDays);

  const lastWd = getWeekdayIndex(lastScheduledKey);
  const endOfWeekWeekday = (startOfWeekWeekday + 6) % 7;
  const trailForwardDays = (endOfWeekWeekday - lastWd + 7) % 7;
  const gridEndKey = addDaysToDateKey(lastScheduledKey, trailForwardDays);

  const scheduledDays: GanttDayCell[] = [];
  const weeks: GanttWeekColumn[] = [];

  let presentCount = 0;
  let autoPresentCount = 0;
  let absentCount = 0;
  let declaredAbsenceCount = 0;
  let cancelledLeaveCount = 0;
  let upcomingCount = 0;

  let cursor = gridStartKey;
  let weekIdx = 0;
  let guard = 0;

  while (cursor <= gridEndKey && guard < 120) {
    guard++;
    const weekCells: GanttDayCell[] = [];
    let firstLabelForWeek = formatDateKeyLabels(cursor);

    for (let r = 0; r < 7; r++) {
      const dateKey = cursor;
      const sched = scheduleMap.get(dateKey);
      const row = persistedMap.get(dateKey);
      const isPast = dateKey < tehranTodayKey;
      const isToday = dateKey === tehranTodayKey;
      const isFuture = dateKey > tehranTodayKey;
      const labels = formatDateKeyLabels(dateKey);
      if (r === 0) firstLabelForWeek = labels;

      if (!sched) {
        weekCells.push({
          dateKey,
          isScheduled: false,
          sessionIndex: null,
          sessionTitle: null,
          status: "FILLER",
          isPast,
          isToday,
          isFuture,
          canStudentDeclareAbsence: false,
          lockedForStudent: true,
          studentNote: null,
          adminNote: null,
          declaredAt: null,
          reviewedAt: null,
          jalaliShort: labels.jalaliShort,
          jalaliFull: labels.jalaliFull,
          gregorianShort: labels.gregorianShort,
          gregorianFull: labels.gregorianFull,
          weekdayIndex: getWeekdayIndex(dateKey),
        });
      } else {
        let status: AttendanceStatus = "SCHEDULED";
        if (row) {
          if (
            row.status === "PRESENT" ||
            row.status === "ABSENT" ||
            row.status === "DECLARED_ABSENCE" ||
            row.status === "AUTO_PRESENT" ||
            row.status === "CANCELLED_LEAVE"
          ) {
            status =
              row.status === "CANCELLED_LEAVE" && isPast && isConfirmed && params.autoAttendance
                ? "AUTO_PRESENT"
                : row.status;
          }
        } else if (isPast && isConfirmed && params.autoAttendance) {
          status = "AUTO_PRESENT";
        }

        if (status === "PRESENT") presentCount++;
        else if (status === "AUTO_PRESENT") autoPresentCount++;
        else if (status === "ABSENT") absentCount++;
        else if (status === "DECLARED_ABSENCE") declaredAbsenceCount++;
        else if (status === "CANCELLED_LEAVE") {
          cancelledLeaveCount++;
          upcomingCount++;
        } else upcomingCount++;

        const lockedForStudent =
          !isConfirmed ||
          isPast ||
          status === "PRESENT" ||
          status === "ABSENT" ||
          status === "AUTO_PRESENT" ||
          status === "DECLARED_ABSENCE" ||
          Boolean(row?.lockedForStudent);

        const canStudentDeclareAbsence =
          isConfirmed &&
          !isPast &&
          !lockedForStudent &&
          (status === "SCHEDULED" || status === "CANCELLED_LEAVE");

        const cell: GanttDayCell = {
          dateKey,
          isScheduled: true,
          sessionIndex: sched.sessionIndex,
          sessionTitle: sched.title,
          status,
          isPast,
          isToday,
          isFuture,
          canStudentDeclareAbsence,
          lockedForStudent,
          studentNote: row?.studentNote ?? null,
          adminNote: row?.adminNote ?? null,
          declaredAt: row?.declaredAt ? new Date(row.declaredAt).toISOString() : null,
          reviewedAt: row?.reviewedAt ? new Date(row.reviewedAt).toISOString() : null,
          jalaliShort: labels.jalaliShort,
          jalaliFull: labels.jalaliFull,
          gregorianShort: labels.gregorianShort,
          gregorianFull: labels.gregorianFull,
          weekdayIndex: getWeekdayIndex(dateKey),
        };
        weekCells.push(cell);
        scheduledDays.push(cell);
      }

      cursor = addDaysToDateKey(cursor, 1);
    }

    // Label month at start of week when day <= 7 or week 0
    const prevWeekEnd = addDaysToDateKey(weekCells[0].dateKey, -7);
    const prevLabels = formatDateKeyLabels(prevWeekEnd);
    const monthLabelFa =
      weekIdx === 0 || firstLabelForWeek.jalaliMonth !== prevLabels.jalaliMonth
        ? firstLabelForWeek.jalaliMonth
        : "";
    const monthLabelEn =
      weekIdx === 0 || firstLabelForWeek.gregorianMonth !== prevLabels.gregorianMonth
        ? firstLabelForWeek.gregorianMonth
        : "";

    weeks.push({
      weekIndex: weekIdx,
      monthLabelFa,
      monthLabelEn,
      cells: weekCells,
    });
    weekIdx++;
  }

  const totalSessions = scheduledDays.length;
  const completedSessions = presentCount + autoPresentCount;
  const passedDecided = completedSessions + absentCount + declaredAbsenceCount;
  const progressPercent =
    totalSessions > 0 ? Math.min(100, Math.round((completedSessions / totalSessions) * 100)) : 0;
  const attendanceRatePercent =
    passedDecided > 0 ? Math.round((completedSessions / passedDecided) * 100) : null;

  return {
    registrationId: params.registrationId,
    registrationStatus: params.registrationStatus,
    autoAttendance: params.autoAttendance,
    tehranTodayKey,
    scheduleStartDateKey: firstScheduledKey,
    scheduleEndDateKey: lastScheduledKey,
    weeks,
    scheduledDays,
    stats: {
      totalSessions,
      sessionHours,
      sessionsPerWeek,
      durationHrs,
      completedSessions,
      completedHrs: Math.min(durationHrs, Math.round(completedSessions * sessionHours * 10) / 10),
      presentCount,
      autoPresentCount,
      absentCount,
      declaredAbsenceCount,
      cancelledLeaveCount,
      upcomingCount,
      progressPercent,
      attendanceRatePercent,
    },
  };
}

export function formatSessionLabel(lang: "fa" | "en", index: number): string {
  return lang === "fa" ? `جلسه ${toFaDigits(index)}` : `Session ${index}`;
}
