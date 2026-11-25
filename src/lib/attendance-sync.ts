import { db } from "./db";
import {
  buildGanttCalendarMatrix,
  generateCourseScheduleDays,
  getTehranTodayKey,
  type GanttData,
} from "./attendance-gantt";

/**
 * Loads a registration with its course schedule & attendance records,
 * automatically materializes any past scheduled sessions (`dateKey < tehranTodayKey`)
 * as `AUTO_PRESENT` if `status === "CONFIRMED"` and `autoAttendance === true`
 * (without overwriting explicit admin overrides or student declared absences),
 * and returns the GitHub-style Gantt matrix.
 */
export async function syncAndGetRegistrationGantt(
  registrationId: string,
  lang: "fa" | "en" = "fa",
): Promise<GanttData | null> {
  const reg = await db.registration.findUnique({
    where: { id: registrationId },
    include: {
      course: {
        select: {
          id: true,
          durationHrs: true,
          sessionDurationHrs: true,
          sessionsPerWeek: true,
          sessions: {
            select: { title: true, date: true, startAt: true, order: true },
            orderBy: [{ startAt: "asc" }, { order: "asc" }],
          },
        },
      },
      session: {
        select: { startAt: true, date: true },
      },
      attendanceDays: true,
    },
  });

  if (!reg) return null;

  const tehranTodayKey = getTehranTodayKey();
  const effectiveStartDate =
    reg.scheduleStartDate ??
    reg.session?.startAt ??
    reg.session?.date ??
    reg.confirmedAt ??
    reg.createdAt;
  const sessionHours = reg.sessionHours ?? reg.course.sessionDurationHrs ?? 2;
  const sessionsPerWeek = reg.sessionsPerWeek ?? reg.course.sessionsPerWeek ?? 2;

  const schedule = generateCourseScheduleDays({
    durationHrs: reg.course.durationHrs || 24,
    sessionHours,
    sessionsPerWeek,
    startDate: effectiveStartDate,
    explicitSessions: reg.course.sessions,
  });

  const existingByDate = new Map(reg.attendanceDays.map((d) => [d.dateKey, d]));

  if (reg.status === "CONFIRMED" && reg.autoAttendance) {
    const toAutoPresent: Array<{ dateKey: string; sessionIndex: number }> = [];
    for (const day of schedule) {
      if (day.dateKey < tehranTodayKey && !existingByDate.has(day.dateKey)) {
        toAutoPresent.push({ dateKey: day.dateKey, sessionIndex: day.sessionIndex });
      }
    }

    if (toAutoPresent.length > 0) {
      await db.$transaction(
        toAutoPresent.map((item) =>
          db.studentAttendanceDay.upsert({
            where: {
              registrationId_dateKey: {
                registrationId: reg.id,
                dateKey: item.dateKey,
              },
            },
            update: {},
            create: {
              registrationId: reg.id,
              dateKey: item.dateKey,
              sessionIndex: item.sessionIndex,
              status: "AUTO_PRESENT",
              lockedForStudent: true,
            },
          }),
        ),
      );
    }
  }

  const freshRows = await db.studentAttendanceDay.findMany({
    where: { registrationId: reg.id },
    orderBy: { dateKey: "asc" },
  });

  return buildGanttCalendarMatrix({
    registrationId: reg.id,
    registrationStatus: reg.status,
    autoAttendance: reg.autoAttendance,
    durationHrs: reg.course.durationHrs || 24,
    sessionHours,
    sessionsPerWeek,
    scheduleStartDate: effectiveStartDate,
    explicitSessions: reg.course.sessions,
    persistedRows: freshRows,
    tehranTodayKey,
    lang,
  });
}
