import { db } from "@/lib/db";
import { matchesNormalizedQuery } from "@/lib/domain/academy-rules";

export const DEFAULT_WORKFLOWS = [
  {
    key: "lead-triage-draft",
    name: "پیش‌نویس هوشمند پاسخ به لید مشاوره",
    nameEn: "Lead Triage & Course Recommendation Draft",
    triggerEvent: "lead.created",
    enabled: true,
    requiresApproval: true,
    description:
      "با ثبت هر درخواست مشاوره، دوره‌های مرتبط با پیام متقاضی را شناسایی کرده و پیش‌نویس پاسخ را در صف تأیید ادمین می‌گذارد.",
    descriptionEn:
      "Matches new consultation leads to live academy courses and queues a drafted response for human admin approval.",
  },
  {
    key: "registration-onboarding-check",
    name: "بررسی پیش‌نیاز و آماده‌سازی ثبت‌نام",
    nameEn: "Enrollment Verification & Session Prep",
    triggerEvent: "enrollment.requested",
    enabled: true,
    requiresApproval: true,
    description:
      "با ثبت‌نام جدید، کد رهگیری و وضعیت ظرفیت را ثبت و کار بررسی پرداخت/تأیید را در صف ادمین قرار می‌دهد.",
    descriptionEn:
      "Logs enrollment snapshot, creates a human review task for tuition verification, and records audit trails.",
  },
];

export async function ensureDefaultWorkflows() {
  for (const wf of DEFAULT_WORKFLOWS) {
    await db.workflowDefinition.upsert({
      where: { key: wf.key },
      create: wf,
      update: {},
    });
  }
}

export async function recordAuditLog(params: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}) {
  await db.auditLog
    .create({
      data: {
        actorId: params.actorId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        beforeJson: params.before ? JSON.stringify(params.before) : null,
        afterJson: params.after ? JSON.stringify(params.after) : null,
      },
    })
    .catch(() => {});
}

export async function emitDomainEvent(params: {
  name: string;
  entityType: string;
  entityId: string;
  payload?: Record<string, unknown>;
  actorId?: string | null;
}) {
  await ensureDefaultWorkflows().catch(() => {});

  const event = await db.domainEvent.create({
    data: {
      name: params.name,
      entityType: params.entityType,
      entityId: params.entityId,
      payloadJson: JSON.stringify(params.payload ?? {}),
      actorId: params.actorId ?? null,
    },
  });

  const workflows = await db.workflowDefinition.findMany({
    where: { triggerEvent: params.name, enabled: true },
  });

  for (const wf of workflows) {
    try {
      if (wf.key === "lead-triage-draft") {
        const message = String(params.payload?.message ?? "");
        const topic = String(params.payload?.topic ?? "");
        const name = String(params.payload?.name ?? "متقاضی");
        const requestId = String(params.payload?.requestId ?? "");

        const courses = await db.course.findMany({
          where: { published: true },
          select: { slug: true, title: true, titleEn: true, tags: true, category: true, tier: true },
          orderBy: { sortOrder: "asc" },
        });

        const matched = courses
          .filter((c) => matchesNormalizedQuery(`${topic} ${message}`, c.title, c.titleEn, c.tags, c.category))
          .slice(0, 3);
        const suggested = matched.length > 0 ? matched : courses.slice(0, 2);

        const draftFa = `سلام ${name} عزیز، درخواست مشاوره شما (${requestId}) ثبت شد. بر اساس هدف شما، دوره‌های پیشنهادی: ${suggested
          .map((c) => `${c.title} (/courses/${c.slug})`)
          .join(" ، ")}. پس از تأیید نهایی کارشناس، هماهنگی تماس انجام می‌شود.`;

        const run = await db.workflowRun.create({
          data: {
            workflowId: wf.id,
            eventId: event.id,
            status: wf.requiresApproval ? "WAITING_APPROVAL" : "SUCCEEDED",
            summary: `Drafted ${suggested.length} course suggestions for ${name}`,
            finishedAt: wf.requiresApproval ? null : new Date(),
          },
        });

        await db.approvalTask.create({
          data: {
            workflowRunId: run.id,
            kind: "LEAD_REPLY_DRAFT",
            title: `پاسخ پیشنهادی برای ${name}`,
            entityType: "Lead",
            entityId: params.entityId,
            proposedAction: draftFa,
            payloadJson: JSON.stringify({
              requestId,
              suggestedSlugs: suggested.map((s) => s.slug),
              phone: params.payload?.phone ?? "",
            }),
            status: "PENDING",
          },
        });
      } else if (wf.key === "registration-onboarding-check") {
        const studentName = String(params.payload?.studentName ?? "هنرجو");
        const courseTitle = String(params.payload?.courseTitle ?? "دوره");
        const trackingCode = String(params.payload?.trackingCode ?? "");

        const run = await db.workflowRun.create({
          data: {
            workflowId: wf.id,
            eventId: event.id,
            status: "WAITING_APPROVAL",
            summary: `Pending confirmation for ${studentName} (${trackingCode})`,
          },
        });

        await db.approvalTask.create({
          data: {
            workflowRunId: run.id,
            kind: "ENROLLMENT_REVIEW",
            title: `بررسی ثبت‌نام ${studentName} — ${courseTitle}`,
            entityType: "Registration",
            entityId: params.entityId,
            proposedAction: `کد پیگیری ${trackingCode}: بررسی وضعیت پرداخت و تأیید نهایی صندلی`,
            payloadJson: JSON.stringify(params.payload ?? {}),
            status: "PENDING",
          },
        });
      }
    } catch (err) {
      await db.workflowRun
        .create({
          data: {
            workflowId: wf.id,
            eventId: event.id,
            status: "FAILED",
            errorMessage: err instanceof Error ? err.message : "Workflow error",
            finishedAt: new Date(),
          },
        })
        .catch(() => {});
    }
  }

  return event;
}
