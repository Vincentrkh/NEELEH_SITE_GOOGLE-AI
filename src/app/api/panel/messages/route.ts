import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { apiMsg } from "@/lib/i18n";

/**
 * GET /api/panel/messages — کارتابل پیام‌های هنرجو
 * PATCH /api/panel/messages — علامت‌گذاری به عنوان خوانده‌شده
 */

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: await apiMsg("لاگین نیستید", "You are not signed in") },
      { status: 401 },
    );
  }

  const items = await db.studentMessageRecipient.findMany({
    where: { studentId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      message: {
        select: {
          id: true,
          title: true,
          body: true,
          channels: true,
          isBroadcast: true,
          createdAt: true,
          sender: { select: { name: true, nameEn: true } },
          course: { select: { title: true, titleEn: true } },
        },
      },
    },
  });

  const messages = items.map((item) => ({
    recipientId: item.id,
    messageId: item.message.id,
    title: item.message.title,
    body: item.message.body,
    channels: item.message.channels.split(",").filter(Boolean),
    isBroadcast: item.message.isBroadcast,
    senderName: item.message.sender?.name ?? null,
    courseTitle: item.message.course?.title ?? null,
    courseTitleEn: item.message.course?.titleEn ?? null,
    readAt: item.readAt ? item.readAt.toISOString() : null,
    createdAt: item.message.createdAt.toISOString(),
  }));

  const unreadCount = messages.filter((m) => !m.readAt).length;
  return NextResponse.json({ messages, unreadCount });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: await apiMsg("لاگین نیستید", "You are not signed in") },
      { status: 401 },
    );
  }

  let body: { recipientId?: string; markAllRead?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: await apiMsg("درخواست نامعتبر است", "Invalid request body") },
      { status: 400 },
    );
  }

  const now = new Date();
  if (body.markAllRead) {
    await db.studentMessageRecipient.updateMany({
      where: { studentId: user.id, readAt: null },
      data: { readAt: now },
    });
  } else if (body.recipientId) {
    await db.studentMessageRecipient.updateMany({
      where: { id: body.recipientId, studentId: user.id, readAt: null },
      data: { readAt: now },
    });
  } else {
    return NextResponse.json(
      { error: await apiMsg("شناسه پیام نامعتبر است", "Invalid message id") },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, readAt: now.toISOString() });
}
