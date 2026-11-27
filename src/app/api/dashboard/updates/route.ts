import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { apiMsg } from "@/lib/i18n";
import { db } from "@/lib/db";
import {
  encryptSecret,
  maskSecret,
  validateGitBranchName,
  validateGitRepoUrl,
} from "@/lib/crypto-vault";
import {
  checkForRemoteUpdates,
  createPreUpdateSnapshot,
  ensureUpdateConfig,
  getSafeUpdateStatus,
  rollbackDatabaseFromLog,
  startBackgroundUpdate,
} from "@/lib/system-updater";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: await apiMsg("فقط مدیر کل مجاز است", "Admin access required") },
      { status: 403 },
    );
  }
  const status = await getSafeUpdateStatus();
  return NextResponse.json(status);
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: await apiMsg("فقط مدیر کل مجاز است", "Admin access required") },
      { status: 403 },
    );
  }

  let body: {
    repoUrl?: string;
    branch?: string;
    authMethod?: string;
    gitToken?: string;
    webhookSecret?: string;
    autoCheckEnabled?: boolean;
    autoApplyEnabled?: boolean;
    checkIntervalMins?: number;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const cfg = await ensureUpdateConfig();

  const repoUrl = (body.repoUrl ?? "").trim();
  if (repoUrl) {
    const check = validateGitRepoUrl(repoUrl);
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }
  }

  const branch = (body.branch ?? "main").trim() || "main";
  if (!validateGitBranchName(branch)) {
    return NextResponse.json(
      { error: await apiMsg("نام شاخه گیت نامعتبر است", "Invalid branch name") },
      { status: 400 },
    );
  }

  const interval = Math.max(
    15,
    Math.min(10080, Math.floor(Number(body.checkIntervalMins ?? cfg.checkIntervalMins) || 60)),
  );

  const authMethod = body.authMethod === "PAT" ? "PAT" : "PUBLIC";

  const updateData: Record<string, unknown> = {
    repoUrl,
    branch,
    authMethod,
    autoCheckEnabled: Boolean(body.autoCheckEnabled),
    autoApplyEnabled: Boolean(body.autoApplyEnabled),
    checkIntervalMins: interval,
  };

  const rawPat = (body.gitToken ?? "").trim();
  if ((body as { clearToken?: boolean }).clearToken || authMethod === "PUBLIC") {
    updateData.encryptedToken = null;
    updateData.tokenHint = null;
  } else if (rawPat) {
    updateData.encryptedToken = encryptSecret(rawPat);
    updateData.tokenHint = maskSecret(rawPat);
  }

  const rawWebhook = (body.webhookSecret ?? "").trim();
  if (rawWebhook) {
    updateData.encryptedWebhookKey = encryptSecret(rawWebhook);
    updateData.webhookHint = maskSecret(rawWebhook);
  }

  await db.systemUpdateConfig.update({
    where: { id: cfg.id },
    data: updateData,
  });

  const status = await getSafeUpdateStatus();
  return NextResponse.json(status);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: await apiMsg("فقط مدیر کل مجاز است", "Admin access required") },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: "check" | "apply" | "snapshot" | "rollback";
    logId?: string;
  };

  if (body.action === "check") {
    const res = await checkForRemoteUpdates({ trigger: "MANUAL", actorId: admin.id });
    const status = await getSafeUpdateStatus();
    return NextResponse.json({ ...res, ...status }, { status: res.ok ? 200 : 400 });
  }

  if (body.action === "apply") {
    const res = await startBackgroundUpdate({
      trigger: "MANUAL",
      actorId: admin.id,
      onFinished: () => {
        try {
          revalidatePath("/", "layout");
        } catch {
          // ignore outside request cache
        }
      },
    });
    const status = await getSafeUpdateStatus();
    return NextResponse.json({ ...res, ...status }, { status: res.ok ? 200 : 400 });
  }

  if (body.action === "snapshot") {
    const startedAt = Date.now();
    const cfg = await ensureUpdateConfig();
    const backupPath = await createPreUpdateSnapshot();
    await db.systemUpdateLog.create({
      data: {
        trigger: "MANUAL",
        status: "SUCCESS",
        fromCommit: cfg.currentCommit,
        toCommit: cfg.currentCommit,
        backupPath,
        summary: "بکاپ کامل پیشگیرانه (دیتابیس و فایل‌ها) ذخیره شد",
        durationMs: Date.now() - startedAt,
        actorId: admin.id,
      },
    });
    const status = await getSafeUpdateStatus();
    return NextResponse.json({ ok: true, ...status });
  }

  if (body.action === "rollback" && body.logId) {
    const res = await rollbackDatabaseFromLog(body.logId, admin.id);
    const status = await getSafeUpdateStatus();
    return NextResponse.json({ ...res, ...status }, { status: res.ok ? 200 : 400 });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
