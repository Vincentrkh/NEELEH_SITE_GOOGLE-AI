"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/components/language-provider";
import { useToast } from "@/hooks/use-toast";
import { localeDateTime, localeNumber } from "@/lib/format";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Copy,
  Database,
  GitBranch,
  History,
  Loader2,
  RefreshCw,
  Rocket,
  RotateCcw,
  Save,
  ShieldCheck,
  Terminal,
  XCircle,
} from "lucide-react";

export type UpdateStatusPayload = {
  config: {
    repoUrl: string;
    branch: string;
    authMethod: string;
    hasToken: boolean;
    tokenHint: string | null;
    hasWebhookSecret: boolean;
    webhookHint: string | null;
    autoCheckEnabled: boolean;
    autoApplyEnabled: boolean;
    checkIntervalMins: number;
    preserveDataPaths: string;
    currentCommit: string | null;
    remoteCommit: string | null;
    remoteCommitMessage: string | null;
    remoteCommitAuthor: string | null;
    remoteCommitDate: string | null;
    pendingUpdatesCount: number;
    lastCheckedAt: string | null;
    lastUpdatedAt: string | null;
    lastStatus: string | null;
    lastError: string | null;
  };
  environment: {
    hasGitDir: boolean;
    appVersion: string;
    dbEngine: string;
    runtimeMode?: "production" | "development";
    isCloudRun?: boolean;
    hasPm2?: boolean;
  };
  logs: Array<{
    id: string;
    trigger: string;
    status: string;
    fromCommit: string | null;
    toCommit: string | null;
    hasBackup: boolean;
    summary: string | null;
    errorMessage: string | null;
    durationMs: number;
    createdAt: string;
  }>;
};

export function SystemUpdaterPanel({
  initialData,
}: {
  initialData: UpdateStatusPayload;
}) {
  const { lang } = useLang();
  const fa = lang === "fa";
  const { toast } = useToast();

  const router = useRouter();
  const [data, setData] = useState<UpdateStatusPayload>(initialData);

  const [repoUrl, setRepoUrl] = useState(initialData.config.repoUrl);
  const [branch, setBranch] = useState(initialData.config.branch);
  const [authMethod, setAuthMethod] = useState<"PUBLIC" | "PAT">(
    initialData.config.authMethod === "PAT" ? "PAT" : "PUBLIC",
  );
  const [gitToken, setGitToken] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(
    initialData.config.autoCheckEnabled,
  );
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(
    initialData.config.autoApplyEnabled,
  );
  const [checkIntervalMins, setCheckIntervalMins] = useState(
    initialData.config.checkIntervalMins,
  );

  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "warning" | "error";
    text: string;
    detail?: string;
  } | null>(null);

  const hasUnsavedConfig =
    repoUrl.trim() !== data.config.repoUrl ||
    branch.trim() !== data.config.branch ||
    authMethod !== (data.config.authMethod === "PAT" ? "PAT" : "PUBLIC") ||
    Boolean(gitToken.trim()) ||
    Boolean(webhookSecret.trim()) ||
    autoCheckEnabled !== data.config.autoCheckEnabled ||
    autoApplyEnabled !== data.config.autoApplyEnabled ||
    checkIntervalMins !== data.config.checkIntervalMins;

  async function persistConfig(): Promise<boolean> {
    const res = await fetch("/api/dashboard/updates/", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repoUrl,
        branch,
        authMethod,
        gitToken: authMethod === "PAT" ? gitToken.trim() || undefined : undefined,
        clearToken: authMethod === "PUBLIC",
        webhookSecret: webhookSecret.trim() || undefined,
        autoCheckEnabled,
        autoApplyEnabled,
        checkIntervalMins,
      }),
    });
    const json = (await res.json()) as UpdateStatusPayload & { error?: string };
    if (!res.ok) {
      const errText = json.error || (fa ? "خطا در ذخیره تنظیمات مخزن" : "Failed to save repository config");
      setFeedback({ kind: "error", text: errText });
      toast({
        title: fa ? "خطا در ذخیره تنظیمات مخزن" : "Failed to save repository config",
        description: json.error,
        variant: "destructive",
      });
      return false;
    }
    setData(json);
    setGitToken("");
    setWebhookSecret("");
    return true;
  }

  async function saveConfig(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const ok = await persistConfig();
      if (ok) {
        const msg = fa ? "تنظیمات مخزن و بروزرسانی ذخیره شد" : "Update settings saved";
        setFeedback({ kind: "success", text: msg });
        toast({ title: msg });
      }
    } finally {
      setSaving(false);
    }
  }

  async function runAction(
    action: "check" | "apply" | "snapshot" | "rollback",
    logId?: string,
  ) {
    const key = logId ? `${action}:${logId}` : action;
    setBusyAction(key);
    setFeedback(null);
    try {
      if ((action === "check" || action === "apply") && hasUnsavedConfig) {
        const savedOk = await persistConfig();
        if (!savedOk) return;
      }

      const res = await fetch("/api/dashboard/updates/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, logId }),
      });
      const json = (await res.json()) as UpdateStatusPayload & {
        ok?: boolean;
        message?: string;
        error?: string;
        updateAvailable?: boolean;
        remoteCommit?: string;
        toCommit?: string;
        changedFilesCount?: number;
        changedFilesSample?: string[];
        needsRestart?: boolean;
        reloaded?: boolean;
      };
      if (json.config && json.logs) {
        setData({
          config: json.config,
          environment: json.environment,
          logs: json.logs,
        });
      }
      if (!res.ok) {
        const errText = json.error || json.message || (fa ? "عملیات بروزرسانی انجام نشد" : "Update action failed");
        setFeedback({ kind: "error", text: errText });
        toast({
          title: fa ? "عملیات بروزرسانی انجام نشد" : "Update action failed",
          description: errText,
          variant: "destructive",
        });
        return;
      }
      const isWarning =
        action === "apply" &&
        (Boolean(json.needsRestart) || json.changedFilesCount === 0);

      const successTitle =
        action === "check"
          ? json.updateAvailable
            ? fa
              ? `بروزرسانی جدید یافت شد (${json.remoteCommit ?? ""})`
              : `Update available (${json.remoteCommit ?? ""})`
            : fa
              ? `بررسی انجام شد — سیستم با مخزن همگام است (${json.remoteCommit ?? ""})`
              : "Checked — repository is up to date"
          : action === "apply"
            ? json.needsRestart
              ? fa
                ? `تغییرات دریافت و بیلد شد اما نیاز به ری‌استارت سرویس است (${json.toCommit ?? ""})`
                : `Built (${json.toCommit ?? ""}) — restart required for live process`
              : fa
                ? `بروزرسانی امن انجام شد (${json.toCommit ?? ""})`
                : "Zero-downtime update applied"
            : action === "snapshot"
              ? fa
                ? "نسخه پشتیبان فوری ایجاد شد"
                : "Instant snapshot created"
              : fa
                ? "دیتابیس با موفقیت بازگردانی شد"
                : "Database restored from snapshot";

      const detailParts: string[] = [];
      if (json.message) detailParts.push(json.message);
      if (json.changedFilesSample && json.changedFilesSample.length > 0) {
        detailParts.push(
          `${fa ? "فایل‌های تغییریافته:" : "Changed files:"} ${json.changedFilesSample.join(", ")}`,
        );
      }

      setFeedback({
        kind: isWarning ? "warning" : "success",
        text: successTitle,
        detail: detailParts.join(" — ") || undefined,
      });
      toast({
        title: successTitle,
        description: json.message,
      });
      if (action === "apply") {
        router.refresh();
      }
    } finally {
      setBusyAction(null);
    }
  }

  function copyText(text: string, label: string) {
    void navigator.clipboard.writeText(text);
    toast({ title: `${label} ${fa ? "کپی شد" : "copied"}` });
  }

  const webhookPath = "/api/system/git-webhook";
  const cfg = data.config;

  return (
    <div className="space-y-8">
      {/* Zero-Downtime & Data Preservation Banner */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 sm:p-5 text-zinc-100 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/95 flex items-start gap-3.5">
        <div className="rounded-md bg-emerald-500/15 border border-emerald-500/30 p-2 shrink-0 mt-0.5">
          <ShieldCheck className="size-4 text-emerald-400" />
        </div>
        <div className="space-y-2 text-xs leading-relaxed flex-1 min-w-0">
          <div className="font-semibold text-sm text-white">
            {fa
              ? "تضمین حفظ ۱۰۰٪ داده‌ها و بدون قطعی برای کاربران"
              : "100% Data Preservation & Zero-Downtime Guarantee"}
          </div>
          <p className="text-zinc-300">
            {fa ? (
              <>
                پیش از هر بروزرسانی، یک بکاپ فوری در سرور گرفته می‌شود و فایل‌های دیتابیس{" "}
                <code dir="ltr" className="mx-0.5 rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-emerald-300">
                  db/custom.db
                </code>
                ، فایل‌های آپلودشده کاربران{" "}
                <code dir="ltr" className="mx-0.5 rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-emerald-300">
                  public/uploads/
                </code>
                ، متغیرهای محیطی{" "}
                <code dir="ltr" className="mx-0.5 rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-emerald-300">
                  .env
                </code>{" "}
                و کلید نشست‌ها دست‌نخورده باقی می‌مانند. همچنین اسکیمای دیتابیس فقط به‌صورت افزایشی همگام‌سازی می‌شود.
              </>
            ) : (
              "Before every update, an automatic snapshot is saved while db/custom.db, public/uploads/, .env, and session secrets are strictly preserved. Prisma migrations run additively."
            )}
          </p>
          <div
            className="inline-block rounded bg-zinc-950/70 border border-zinc-800 px-2.5 py-1 font-mono text-[11px] text-emerald-300"
            dir="ltr"
          >
            Protected paths: {cfg.preserveDataPaths}
          </div>
        </div>
      </div>

      {/* Status Overview Strip */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>{fa ? "نسخه / کامیت فعلی" : "Current Revision"}</span>
            <GitBranch className="size-4" />
          </div>
          <div className="text-lg font-medium font-mono truncate" dir="ltr">
            {cfg.currentCommit || `v${data.environment.appVersion}`}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {data.environment.dbEngine} · v{data.environment.appVersion}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>{fa ? "آخرین وضعیت مخزن" : "Remote Head"}</span>
            <RefreshCw className="size-4" />
          </div>
          <div className="text-lg font-medium font-mono truncate" dir="ltr">
            {cfg.remoteCommit || (fa ? "بررسی نشده" : "Not checked")}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground truncate">
            {cfg.remoteCommitMessage ||
              (cfg.lastCheckedAt
                ? localeDateTime(lang, cfg.lastCheckedAt)
                : fa
                  ? "منتظر اولین بررسی"
                  : "Awaiting first check")}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>{fa ? "بروزرسانی در انتظار" : "Pending Updates"}</span>
            <Rocket className="size-4" />
          </div>
          <div className="text-2xl font-medium tabular-nums">
            {localeNumber(lang, cfg.pendingUpdatesCount)}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {cfg.pendingUpdatesCount > 0
              ? fa
                ? "آماده اعمال امن"
                : "Ready to apply safely"
              : fa
                ? "سایت کاملاً بروز است"
                : "Up to date"}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>{fa ? "بکاپ و سلامت سیستم" : "Backup & Health"}</span>
            <Database className="size-4" />
          </div>
          <div
            className={`text-sm font-semibold flex items-center gap-1.5 ${
              cfg.lastStatus === "FAILED"
                ? "text-rose-700"
                : cfg.lastStatus === "RESTART_REQUIRED"
                  ? "text-amber-700"
                  : cfg.lastStatus === "SUCCESS" || cfg.lastStatus === "UP_TO_DATE"
                    ? "text-emerald-700"
                    : "text-foreground"
            }`}
          >
            {cfg.lastStatus === "FAILED" ? (
              <XCircle className="size-4" />
            ) : cfg.lastStatus === "RESTART_REQUIRED" ? (
              <AlertTriangle className="size-4 text-amber-600" />
            ) : (
              <CheckCircle2 className="size-4 text-emerald-600" />
            )}
            <span>{cfg.lastStatus || (fa ? "آماده" : "Ready")}</span>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground truncate">
            {cfg.lastError ||
              (cfg.lastUpdatedAt
                ? `${fa ? "آخرین آپدیت:" : "Updated:"} ${localeDateTime(lang, cfg.lastUpdatedAt)}`
                : data.environment.runtimeMode === "production"
                  ? data.environment.hasPm2
                    ? fa
                      ? "محیط تولید (PM2 زنده)"
                      : "Production (PM2 Live)"
                    : data.environment.isCloudRun
                      ? fa
                        ? "محیط پیش‌نمایش Shared (Cloud Run)"
                        : "Shared Preview (Cloud Run)"
                      : fa
                        ? "محیط تولید (نیاز به ری‌استارت دستی)"
                        : "Production (Manual restart)"
                  : fa
                    ? "محیط توسعه (اعمال آنی فایل‌ها)"
                    : "Development (Live sync)")}
          </div>
        </div>
      </div>

      {/* Primary Action Bar */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        {data.environment.runtimeMode === "production" && !data.environment.hasPm2 && (
          <div className="rounded-md border border-amber-300 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2 leading-relaxed">
            <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              {data.environment.isCloudRun
                ? fa
                  ? "توجه: سایت هم‌اکنون در محیط Shared App (Cloud Run) با بیلد ایستا اجرا می‌شود. بروزرسانی گیت فایل‌ها را همگام‌سازی و بیلد می‌کند، اما برای تغییر ترافیک زنده روی لینک Shared باید بعد از تغییر، دکمه Publish را بزنید یا سایت را روی سرور VPS با PM2 اجرا کنید."
                  : "Note: Running in Cloud Run shared preview mode. Git sync rebuilds locally, but live Cloud Run traffic requires re-publishing or running on a VPS with PM2."
                : fa
                  ? "توجه: محیط تولید بدون PM2 فعال است؛ پس از بیلد جدید توسط آپدیتر، برای نمایش تغییرات در سایت اصلی سرویس سرور را یک‌بار ری‌استارت کنید."
                  : "Note: Running in production without PM2. Restart the Node process once after an update build completes."}
            </span>
          </div>
        )}

        {!repoUrl.trim() && (
          <div className="rounded-md border border-amber-300 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-xs text-amber-900 dark:text-amber-300 flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-600 shrink-0" />
            <span>
              {fa
                ? "هنوز آدرس مخزن گیت تنظیم نشده است؛ آدرس HTTPS مخزن خود را در فرم زیر وارد کرده و بررسی یا بروزرسانی را بزنید."
                : "No Git repository URL configured yet. Enter your HTTPS repo URL in the form below before checking or applying updates."}
            </span>
          </div>
        )}

        {feedback && (
          <div
            className={`rounded-md border px-3.5 py-3 text-xs flex items-start gap-2.5 leading-relaxed ${
              feedback.kind === "error"
                ? "border-rose-300 bg-rose-950/5 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200"
                : feedback.kind === "warning"
                  ? "border-amber-300 bg-zinc-50 dark:bg-zinc-900 text-amber-900 dark:text-amber-200"
                  : "border-emerald-300 bg-zinc-50 dark:bg-zinc-900 text-emerald-900 dark:text-emerald-200"
            }`}
          >
            {feedback.kind === "error" ? (
              <XCircle className="size-4 text-rose-600 shrink-0 mt-0.5" />
            ) : feedback.kind === "warning" ? (
              <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1 min-w-0">
              <div className="font-semibold">{feedback.text}</div>
              {feedback.detail && (
                <div className="opacity-90 break-words">{feedback.detail}</div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={Boolean(busyAction)}
            onClick={() => void runAction("check")}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-md border border-border bg-background px-4 text-xs font-medium hover:bg-secondary disabled:opacity-50"
          >
            {busyAction === "check" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            <span>{fa ? "بررسی بروزرسانی از مخزن" : "Check for Updates"}</span>
          </button>

          <button
            type="button"
            disabled={Boolean(busyAction)}
            onClick={() => void runAction("apply")}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-md bg-foreground text-background px-5 text-xs font-medium hover:opacity-90 disabled:opacity-50"
          >
            {busyAction === "apply" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Rocket className="size-4" />
            )}
            <span>{fa ? "بروزرسانی امن و بدون قطعی" : "Apply Zero-Downtime Update"}</span>
          </button>

          <button
            type="button"
            disabled={Boolean(busyAction)}
            onClick={() => void runAction("snapshot")}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-md border border-border bg-background px-4 text-xs font-medium hover:bg-secondary disabled:opacity-50"
          >
            {busyAction === "snapshot" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Archive className="size-4" />
            )}
            <span>{fa ? "گرفتن بکاپ فوری" : "Create Snapshot Now"}</span>
          </button>
        </div>
      </div>

      {/* Repository & Periodic Schedule Form */}
      <form
        onSubmit={saveConfig}
        className="rounded-lg border border-border bg-card p-5 sm:p-6 space-y-5"
      >
        <div>
          <h2 className="text-base font-semibold">
            {fa ? "تنظیمات مخزن گیت و زمان‌بندی دوره‌ای" : "Git Repository & Periodic Schedule"}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {fa
              ? "مخزن GitHub، GitLab یا هر سرور گیت HTTPS را متصل کنید تا بروزرسانی خودکار یا با Webhook انجام شود."
              : "Connect any HTTPS Git repository for scheduled checks, webhooks, or manual safe updates."}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 grid gap-1.5">
            <label className="text-xs text-muted-foreground">
              {fa ? "آدرس HTTPS مخزن گیت" : "HTTPS Git Repository URL"}
            </label>
            <input
              dir="ltr"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/your-org/neeleh-academy"
              className="min-h-[42px] rounded-md border border-border bg-background px-3 text-xs font-mono outline-none focus:border-foreground"
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs text-muted-foreground">{fa ? "شاخه (Branch)" : "Branch"}</label>
            <input
              dir="ltr"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="min-h-[42px] rounded-md border border-border bg-background px-3 text-xs font-mono outline-none focus:border-foreground"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="grid gap-1.5">
            <label className="text-xs text-muted-foreground">
              {fa ? "نوع دسترسی مخزن" : "Repository Access"}
            </label>
            <select
              value={authMethod}
              onChange={(e) => setAuthMethod(e.target.value as "PUBLIC" | "PAT")}
              className="min-h-[42px] rounded-md border border-border bg-background px-3 text-xs outline-none focus:border-foreground"
            >
              <option value="PUBLIC">{fa ? "عمومی (Public HTTPS)" : "Public HTTPS"}</option>
              <option value="PAT">{fa ? "خصوصی با توکن (Private PAT)" : "Private Token (PAT)"}</option>
            </select>
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs text-muted-foreground">
              {fa
                ? `توکن دسترسی گیت${authMethod === "PAT" && cfg.hasToken ? ` (${cfg.tokenHint || "ذخیره‌شده"})` : ""}`
                : `Git PAT Token${authMethod === "PAT" && cfg.hasToken ? ` (${cfg.tokenHint || "Saved"})` : ""}`}
            </label>
            <input
              type="password"
              name="neeleh_git_pat"
              dir="ltr"
              autoComplete="off"
              disabled={authMethod === "PUBLIC"}
              value={authMethod === "PUBLIC" ? "" : gitToken}
              onChange={(e) => setGitToken(e.target.value)}
              placeholder={
                authMethod === "PUBLIC"
                  ? fa
                    ? "در حالت عمومی نیازی نیست"
                    : "Not needed for Public repo"
                  : cfg.hasToken
                    ? "••••••••"
                    : "ghp_... / github_pat_..."
              }
              className="min-h-[42px] rounded-md border border-border bg-background px-3 text-xs outline-none focus:border-foreground disabled:opacity-55 disabled:bg-secondary/30"
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs text-muted-foreground">
              {fa ? "بازه بررسی خودکار" : "Check Interval"}
            </label>
            <select
              value={checkIntervalMins}
              onChange={(e) => setCheckIntervalMins(Number(e.target.value))}
              className="min-h-[42px] rounded-md border border-border bg-background px-3 text-xs outline-none focus:border-foreground"
            >
              <option value={15}>{fa ? "هر ۱۵ دقیقه" : "Every 15 minutes"}</option>
              <option value={30}>{fa ? "هر ۳۰ دقیقه" : "Every 30 minutes"}</option>
              <option value={60}>{fa ? "هر ۱ ساعت" : "Hourly"}</option>
              <option value={360}>{fa ? "هر ۶ ساعت" : "Every 6 hours"}</option>
              <option value={1440}>{fa ? "روزانه (۲۴ ساعت)" : "Daily"}</option>
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 pt-2 border-t border-border">
          <div className="grid gap-1.5">
            <label className="text-xs text-muted-foreground">
              {fa
                ? `کلید امنیتی Webhook گیت‌هاب${cfg.hasWebhookSecret ? ` (${cfg.webhookHint || "تنظیم‌شده"})` : ""}`
                : `Webhook HMAC Secret${cfg.hasWebhookSecret ? ` (${cfg.webhookHint || "Saved"})` : ""}`}
            </label>
            <input
              type="password"
              dir="ltr"
              autoComplete="new-password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder={cfg.hasWebhookSecret ? "••••••••" : "whsec_..."}
              className="min-h-[42px] rounded-md border border-border bg-background px-3 text-xs outline-none focus:border-foreground"
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs text-muted-foreground">
              {fa ? "آدرس Webhook (برای Push خودکار گیت‌هاب)" : "GitHub Push Webhook Endpoint"}
            </label>
            <div className="flex items-center gap-2">
              <code
                dir="ltr"
                className="flex-1 min-h-[42px] flex items-center rounded-md border border-border bg-secondary/40 px-3 text-xs font-mono truncate"
              >
                {webhookPath}
              </code>
              <button
                type="button"
                onClick={() =>
                  copyText(`${window.location.origin}${webhookPath}`, fa ? "آدرس Webhook" : "Webhook URL")
                }
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-md border border-border px-3 text-xs hover:bg-secondary"
              >
                <Copy className="size-3.5" />
                <span>{fa ? "کپی" : "Copy"}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="flex flex-wrap gap-6 text-xs">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoCheckEnabled}
                onChange={(e) => setAutoCheckEnabled(e.target.checked)}
                className="size-4 accent-foreground"
              />
              <span>{fa ? "بررسی دوره‌ای خودکار فعال باشد" : "Enable periodic update checks"}</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoApplyEnabled}
                onChange={(e) => setAutoApplyEnabled(e.target.checked)}
                className="size-4 accent-foreground"
              />
              <span>
                {fa
                  ? "اعمال خودکار پس از Push یا تشخیص نسخه جدید"
                  : "Auto-apply on webhook push or new version"}
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-foreground text-background px-5 text-xs font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            <span>{fa ? "ذخیره تنظیمات" : "Save Configuration"}</span>
          </button>
        </div>
      </form>

      {/* Zero-Downtime VPS Cron Script Reference */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Terminal className="size-4 text-muted-foreground" />
          <span>
            {fa
              ? "اسکریپت بروزرسانی بدون قطعی سرور (VPS Atomic Blue-Green / PM2 Reload)"
              : "Zero-Downtime Server Rollout Script"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {fa
            ? "روی سرور لینوکس می‌توانید از اسکریپت آماده scripts/zero-downtime-update.sh در Cronjob استفاده کنید تا بیلد بعدی قبل از تعویض نسخه آماده شود و کاربران در حین بروزرسانی هیچ خطا یا قطعی نبینند:"
            : "Schedule scripts/zero-downtime-update.sh in cron to pre-build releases and reload seamlessly without dropping active visitor requests:"}
        </p>
        <div
          dir="ltr"
          className="rounded-md bg-secondary/50 border border-border px-3.5 py-2.5 text-xs font-mono overflow-x-auto"
        >
          */15 * * * * bash /var/www/neeleh/scripts/zero-downtime-update.sh &gt;&gt; /var/log/neeleh-update.log 2&gt;&amp;1
        </div>
      </div>

      {/* Update History & Rollback Table */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <History className="size-4 text-muted-foreground" />
          <h2 className="text-lg font-medium">
            {fa ? "تاریخچه بروزرسانی‌ها و بازگردانی بکاپ" : "Update Logs & Snapshot Rollback"}
          </h2>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-xs">
            <thead className="border-b border-border bg-secondary/30 text-muted-foreground">
              <tr>
                <th className="py-3 px-4 text-start font-medium">{fa ? "منبع" : "Trigger"}</th>
                <th className="py-3 px-4 text-start font-medium">{fa ? "وضعیت" : "Status"}</th>
                <th className="py-3 px-4 text-start font-medium">{fa ? "خلاصه تغییرات" : "Summary"}</th>
                <th className="py-3 px-4 text-start font-medium">{fa ? "کامیت" : "Revision"}</th>
                <th className="py-3 px-4 text-start font-medium">{fa ? "زمان" : "Date"}</th>
                <th className="py-3 px-4 text-end font-medium">{fa ? "بازگردانی" : "Rollback"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    {fa ? "هنوز رویدادی ثبت نشده است." : "No update events recorded yet."}
                  </td>
                </tr>
              ) : (
                data.logs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-3 px-4 font-mono">{log.trigger}</td>
                    <td
                      className={`py-3 px-4 font-medium ${
                        log.status === "SUCCESS" || log.status === "UP_TO_DATE"
                          ? "text-emerald-700"
                          : log.status === "FAILED"
                            ? "text-rose-700"
                            : "text-amber-700"
                      }`}
                    >
                      {log.status}
                    </td>
                    <td className="py-3 px-4 max-w-sm">
                      <div>{log.summary || "—"}</div>
                      {log.errorMessage && (
                        <div className="text-rose-700 mt-0.5">{log.errorMessage}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono" dir="ltr">
                      {log.toCommit || log.fromCommit || "—"}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground tabular-nums">
                      {localeDateTime(lang, log.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-end">
                      {log.hasBackup ? (
                        <button
                          type="button"
                          disabled={Boolean(busyAction)}
                          onClick={() => void runAction("rollback", log.id)}
                          className="inline-flex min-h-[32px] items-center gap-1 rounded border border-border px-2.5 text-[11px] font-medium hover:bg-secondary disabled:opacity-50"
                        >
                          {busyAction === `rollback:${log.id}` ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <RotateCcw className="size-3" />
                          )}
                          <span>{fa ? "بازگردانی دیتابیس" : "Restore DB"}</span>
                        </button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
