import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiMsg } from "@/lib/i18n";

/** افزودن جلسه یا نوبت به دوره (ادمین) */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: await apiMsg("دسترسی مجاز نیست", "Not authorized") },
      { status: 403 }
    );
  }

  const body = (await req.json()) as {
    courseId?: string;
    title?: string;
    date?: string;
    format?: string;
    startAt?: string;
    endAt?: string;
    capacity?: number | null;
    priceAmount?: number | null;
    locationOrPlatform?: string;
    status?: string;
    registrationDeadline?: string;
  };
  const title = (body.title ?? "").trim();
  if (!body.courseId || !title) {
    return NextResponse.json(
      { error: await apiMsg("دوره و عنوان جلسه الزامی است", "Course and session title are required") },
      { status: 400 }
    );
  }

  const count = await db.courseSession.count({ where: { courseId: body.courseId } });
  const startAt = body.startAt ? new Date(body.startAt) : body.date ? new Date(body.date) : null;
  const endAt = body.endAt ? new Date(body.endAt) : null;
  const registrationDeadline = body.registrationDeadline
    ? new Date(body.registrationDeadline)
    : null;

  const session = await db.courseSession.create({
    data: {
      courseId: body.courseId,
      title,
      date: body.date ? new Date(body.date) : startAt,
      format: body.format?.trim() || "IN_PERSON",
      startAt,
      endAt,
      capacity: typeof body.capacity === "number" ? body.capacity : null,
      priceAmount: typeof body.priceAmount === "number" ? body.priceAmount : null,
      locationOrPlatform: body.locationOrPlatform?.trim() || null,
      status: body.status?.trim() || "OPEN",
      registrationDeadline,
      order: count,
    },
  });

  return NextResponse.json({ ok: true, session });
}
