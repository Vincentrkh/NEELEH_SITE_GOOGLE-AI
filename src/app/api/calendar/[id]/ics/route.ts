import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function toIcsUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(s: string): string {
  return String(s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = await db.courseSession.findUnique({
    where: { id },
    include: {
      course: {
        select: { slug: true, title: true, titleEn: true, published: true },
      },
    },
  });

  if (!session || !session.course.published) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const start = session.startAt ?? session.date ?? new Date(Date.now() + 7 * 86_400_000);
  const end = session.endAt ?? new Date(start.getTime() + 2 * 3600_000);
  const now = new Date();
  const location = session.locationOrPlatform || "Damghan — Neeleh Academy";
  const summary = `${session.course.titleEn || session.course.title} — ${session.title}`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Neeleh Academy//Cohort Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${session.id}@neeleh.academy`,
    `DTSTAMP:${toIcsUtc(now)}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `LOCATION:${escapeIcsText(location)}`,
    `DESCRIPTION:${escapeIcsText(`Neeleh Architecture Academy — /courses/${session.course.slug}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="neeleh-${session.course.slug}-${session.id.slice(0, 6)}.ics"`,
    },
  });
}
