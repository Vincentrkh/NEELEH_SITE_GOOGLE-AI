import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { decryptSecret, verifyGithubHmacSignature } from "@/lib/crypto-vault";
import {
  applyZeroDowntimeUpdate,
  checkForRemoteUpdates,
  ensureUpdateConfig,
} from "@/lib/system-updater";

export const dynamic = "force-dynamic";

/**
 * POST /api/system/git-webhook
 * Triggered by GitHub push webhooks (`X-Hub-Signature-256`) or periodic cron (`Authorization: Bearer <CRON_SECRET>`).
 * Verifies cryptographic signatures before executing zero-downtime update checks/sync.
 */
export async function POST(req: NextRequest) {
  const cfg = await ensureUpdateConfig();
  const rawBody = await req.text();

  const cronSecret = process.env.CRON_SECRET?.trim() || "";
  const webhookSecret =
    decryptSecret(cfg.encryptedWebhookKey) || process.env.UPDATE_WEBHOOK_SECRET?.trim() || "";

  const authHeader = req.headers.get("authorization") ?? "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const sigHeader = req.headers.get("x-hub-signature-256");

  const validCron = Boolean(cronSecret && bearerToken && bearerToken === cronSecret);
  const validGithub = Boolean(
    webhookSecret && verifyGithubHmacSignature(rawBody, sigHeader, webhookSecret),
  );

  if (!validCron && !validGithub) {
    return NextResponse.json(
      { error: "Unauthorized webhook or cron request" },
      { status: 401 },
    );
  }

  const trigger = validCron ? "SCHEDULED" : "WEBHOOK";
  if (cfg.autoApplyEnabled) {
    const res = await applyZeroDowntimeUpdate({ trigger });
    if (res.ok) {
      try {
        revalidatePath("/", "layout");
      } catch {
        // ignore
      }
    }
    return NextResponse.json(res, { status: res.ok ? 200 : 500 });
  }

  const res = await checkForRemoteUpdates({ trigger });
  return NextResponse.json(res, { status: res.ok ? 200 : 500 });
}
