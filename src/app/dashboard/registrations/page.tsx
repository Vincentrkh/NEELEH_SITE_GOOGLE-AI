import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { RegistrationsTable } from "@/components/registrations-table";
import { localeNumber } from "@/lib/format";
import { dict, getServerLang } from "@/lib/i18n";
import { syncAndGetRegistrationGantt } from "@/lib/attendance-sync";
import {
  MESSAGE_CHANNELS,
  type MessageChannel,
  buildRecipientDispatchLinks,
  isSmtpConfigured,
  isTelegramBotConfigured,
} from "@/lib/messaging";

export const dynamic = "force-dynamic";

export default async function DashboardRegistrationsPage() {
  const user = await getCurrentUser();
  const lang = await getServerLang();
  const isAdmin = !!user?.roles.includes("ADMIN");
  if (!isAdmin && !user?.permissions.includes("registration.view")) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        {lang === "fa" ? "دسترسی مجاز نیست" : "Access denied"}
      </div>
    );
  }
  const canUpdate = isAdmin || !!user?.permissions.includes("registration.update");
  const canDelete = isAdmin || !!user?.permissions.includes("registration.delete");
  const canExport = isAdmin || !!user?.permissions.includes("registration.export");
  const t = dict[lang].dashboard;

  const [registrations, courses, sentMessages] = await Promise.all([
    db.registration.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            nameEn: true,
            phone: true,
            email: true,
            field: true,
            education: true,
            telegram: true,
            whatsapp: true,
            eitaa: true,
            bale: true,
            instagram: true,
            linkedin: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            titleEn: true,
            slug: true,
            price: true,
            tier: true,
            durationHrs: true,
          },
        },
      },
    }),
    db.course.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: { id: true, title: true, titleEn: true },
    }),
    db.studentMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        sender: { select: { name: true } },
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
    }),
  ]);

  const enrichedRegistrations = await Promise.all(
    registrations.map(async (r) => {
      const gantt = await syncAndGetRegistrationGantt(r.id, lang);
      return {
        id: r.id,
        trackingCode: r.trackingCode,
        status: r.status as "PENDING" | "CONFIRMED" | "CANCELLED",
        paymentStatus: r.paymentStatus as "PAID" | "UNPAID",
        note: r.note,
        createdAt: r.createdAt.toISOString(),
        student: r.student,
        course: r.course,
        gantt,
      };
    }),
  );

  const initialMessages = sentMessages.map((m) => {
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

  const pendingCount = registrations.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          {t.regsEyebrow}
        </p>
        <h1 className="text-3xl sm:text-4xl font-medium tracking-[-0.03em]">
          {t.regsTitle}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t.regsSummary
            .replace("{count}", localeNumber(lang, registrations.length))
            .replace("{pending}", localeNumber(lang, pendingCount))}
        </p>
      </div>

      <RegistrationsTable
        initialRegistrations={enrichedRegistrations}
        courses={courses}
        initialMessages={initialMessages}
        capabilities={{
          smtpConfigured: isSmtpConfigured(),
          telegramBotConfigured: isTelegramBotConfigured(),
        }}
        canUpdate={canUpdate}
        canDelete={canDelete}
        canExport={canExport}
      />
    </div>
  );
}
