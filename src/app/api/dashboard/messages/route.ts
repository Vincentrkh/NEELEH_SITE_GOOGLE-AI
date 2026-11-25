import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { apiMsg } from "@/lib/i18n";
import {
  MESSAGE_CHANNELS,
  type MessageChannel,
  buildRecipientDispatchLinks,
  dispatchEmailNotification,
  isSmtpConfigured,
  isTelegramBotConfigured,
  tryTelegramBotSend,
} from "@/lib/messaging";

/**
 * GET /api/dashboard/messages — تاریخچه پیام‌های ارسالی کارتابل و کانال‌های خروجی
 * POST /api/dashboard/messages — ارسال تکی، انتخابی یا جمعی به کارتابل هنرآموزها + ایمیل و پیام‌رسان‌ها
 */

export async function GET() {
  const user = await requirePermission("registration.view");
  if (!user) {
    return NextResponse.json(
      { error: await apiMsg("دسترسی مجاز نیست", "Not authorized") },
      { status: 403 },
    );
  }

  const messages = await db.studentMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      sender: { select: { id: true, name: true } },
      course: { select: { id: true, title: true, titleEn: true } },
      recipients: {
        include: {
          student: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              telegram: true,
              whatsapp: true,
              eitaa: true,
              bale: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const formatted = messages.map((m) => {
    const channels = m.channels
      .split(",")
      .map((c) => c.trim())
      .filter((c): c is MessageChannel =>
        (MESSAGE_CHANNELS as readonly string[]).includes(c),
      );
    return {
      id: m.id,
      title: m.title,
      body: m.body,
      channels,
      isBroadcast: m.isBroadcast,
      course: m.course,
      senderName: m.sender?.name ?? null,
      createdAt: m.createdAt.toISOString(),
      totalRecipients: m.recipients.length,
      readCount: m.recipients.filter((r) => Boolean(r.readAt)).length,
      emailSentCount: m.recipients.filter((r) => r.emailStatus === "SENT").length,
      recipients: m.recipients.map((r) => ({
        id: r.id,
        studentId: r.studentId,
        studentName: r.student.name,
        studentPhone: r.student.phone,
        readAt: r.readAt ? r.readAt.toISOString() : null,
        emailStatus: r.emailStatus,
        emailError: r.emailError,
        messengerStatus: r.messengerStatus,
        messengerTarget: r.messengerTarget,
        links: buildRecipientDispatchLinks({
          student: r.student,
          channels,
          title: m.title,
          body: m.body,
        }),
      })),
    };
  });

  return NextResponse.json({
    messages: formatted,
    capabilities: {
      smtpConfigured: isSmtpConfigured(),
      telegramBotConfigured: isTelegramBotConfigured(),
    },
  });
}

type SendBody = {
  title?: string;
  body?: string;
  channels?: string[];
  registrationIds?: string[];
  courseId?: string;
  statusFilter?: string;
  isBroadcast?: boolean;
};

export async function POST(req: NextRequest) {
  const user = await requirePermission("registration.update");
  if (!user) {
    return NextResponse.json(
      { error: await apiMsg("دسترسی مجاز نیست", "Not authorized") },
      { status: 403 },
    );
  }

  let payload: SendBody;
  try {
    payload = (await req.json()) as SendBody;
  } catch {
    return NextResponse.json(
      { error: await apiMsg("درخواست نامعتبر است", "Invalid request body") },
      { status: 400 },
    );
  }

  const title = String(payload.title ?? "").trim().slice(0, 160);
  const bodyText = String(payload.body ?? "").trim().slice(0, 4000);
  if (title.length < 2 || bodyText.length < 2) {
    return NextResponse.json(
      { error: await apiMsg("عنوان و متن پیام الزامی است", "Message title and body are required") },
      { status: 400 },
    );
  }

  const selectedChannels: MessageChannel[] = Array.isArray(payload.channels)
    ? Array.from(
        new Set(
          payload.channels
            .map((c) => String(c).toUpperCase().trim())
            .filter((c): c is MessageChannel =>
              (MESSAGE_CHANNELS as readonly string[]).includes(c),
            ),
        ),
      )
    : ["CARTABLE"];
  if (!selectedChannels.includes("CARTABLE")) {
    selectedChannels.unshift("CARTABLE");
  }

  // Resolve target registrations (either explicit registrationIds or cohort/status filter)
  const whereClause: { [k: string]: unknown } = {};
  if (Array.isArray(payload.registrationIds) && payload.registrationIds.length > 0) {
    whereClause.id = { in: payload.registrationIds.slice(0, 500) };
  } else {
    if (payload.courseId) whereClause.courseId = payload.courseId;
    if (payload.statusFilter) whereClause.status = payload.statusFilter;
    else whereClause.status = { not: "CANCELLED" };
  }

  const targetRegs = await db.registration.findMany({
    where: whereClause,
    include: {
      student: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          telegram: true,
          whatsapp: true,
          eitaa: true,
          bale: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (targetRegs.length === 0) {
    return NextResponse.json(
      { error: await apiMsg("هیچ هنرآموزی با این انتخاب یافت نشد", "No matching students found") },
      { status: 400 },
    );
  }

  // Deduplicate by studentId so a student enrolled in multiple courses receives 1 Cartable message per broadcast
  const uniqueTargets = new Map<string, (typeof targetRegs)[number]>();
  for (const r of targetRegs) {
    if (!uniqueTargets.has(r.studentId)) {
      uniqueTargets.set(r.studentId, r);
    }
  }
  const recipientsList = Array.from(uniqueTargets.values());
  const isBroadcast = Boolean(payload.isBroadcast || recipientsList.length > 1);

  const wantsEmail = selectedChannels.includes("EMAIL");
  const wantsMessenger = selectedChannels.some((c) =>
    ["TELEGRAM", "WHATSAPP", "EITAA", "BALE"].includes(c),
  );

  const message = await db.studentMessage.create({
    data: {
      senderId: user.id,
      title,
      body: bodyText,
      channels: selectedChannels.join(","),
      isBroadcast,
      courseId: payload.courseId || null,
    },
  });

  const dispatchResults = [];
  for (const reg of recipientsList) {
    const s = reg.student;
    let emailStatus: string = "SKIPPED";
    let emailError: string | null = null;
    if (wantsEmail) {
      const res = await dispatchEmailNotification({
        to: s.email,
        subject: title,
        text: bodyText,
        studentName: s.name,
      });
      emailStatus = res.status;
      emailError = res.error ?? null;
    }

    const links = buildRecipientDispatchLinks({
      student: s,
      channels: selectedChannels,
      title,
      body: bodyText,
    });

    let messengerStatus: string = "SKIPPED";
    let messengerTarget: string | null = null;
    if (wantsMessenger) {
      const messengerLinks = links.filter((l) => l.channel !== "email");
      if (selectedChannels.includes("TELEGRAM") && s.telegram && isTelegramBotConfigured()) {
        const tgRes = await tryTelegramBotSend({
          handleOrChatId: s.telegram,
          title,
          body: bodyText,
        });
        if (tgRes.sent) {
          messengerStatus = "SENT";
          messengerTarget = s.telegram;
        }
      }
      if (messengerStatus === "SKIPPED") {
        if (messengerLinks.length > 0) {
          messengerStatus = "LINK_READY";
          messengerTarget = messengerLinks.map((l) => `${l.channel}:${l.handle}`).join(", ");
        } else {
          messengerStatus = "NO_CONTACT";
        }
      }
    }

    const rec = await db.studentMessageRecipient.create({
      data: {
        messageId: message.id,
        studentId: s.id,
        registrationId: reg.id,
        emailStatus,
        emailError,
        messengerStatus,
        messengerTarget,
      },
    });

    dispatchResults.push({
      id: rec.id,
      studentId: s.id,
      studentName: s.name,
      studentPhone: s.phone,
      emailStatus,
      emailError,
      messengerStatus,
      messengerTarget,
      links,
    });
  }

  return NextResponse.json({
    ok: true,
    message: {
      id: message.id,
      title: message.title,
      body: message.body,
      channels: selectedChannels,
      isBroadcast,
      createdAt: message.createdAt.toISOString(),
      totalRecipients: dispatchResults.length,
      readCount: 0,
      emailSentCount: dispatchResults.filter((r) => r.emailStatus === "SENT").length,
      recipients: dispatchResults,
    },
  });
}
