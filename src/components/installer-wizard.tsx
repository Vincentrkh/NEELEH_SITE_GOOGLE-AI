"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  Shield,
  Database,
  User,
  Globe,
  Lock,
  Rocket,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

type EnvCheck = {
  name: string;
  label: string;
  status: "ok" | "warn" | "fail";
  detail: string;
};

type InstallStep = {
  name: string;
  label: string;
  status: "pending" | "running" | "done" | "failed";
  detail?: string;
};

type Config = {
  dbType: "sqlite" | "postgres";
  postgres: { host: string; port: string; database: string; user: string; password: string };
  adminName: string;
  adminPhone: string;
  adminPassword: string;
  adminPasswordConfirm: string;
  siteUrl: string;
  siteTitle: string;
  contactEmail: string;
  sessionSecret: string;
  seedCourses: boolean;
};

const DEFAULT_CONFIG: Config = {
  dbType: "sqlite",
  postgres: { host: "localhost", port: "5432", database: "neeleh", user: "neeleh", password: "" },
  adminName: "",
  adminPhone: "",
  adminPassword: "",
  adminPasswordConfirm: "",
  siteUrl: "http://localhost:3000",
  siteTitle: "آکادمی نیله",
  contactEmail: "",
  sessionSecret: "",
  seedCourses: true,
};

const STEPS = ["محیط", "دیتابیس", "ادمین", "سایت", "امنیت", "نصب"];

export function InstallerWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [csrf, setCsrf] = useState("");
  const [checks, setChecks] = useState<EnvCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbTestResult, setDbTestResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installSteps, setInstallSteps] = useState<InstallStep[]>([]);
  const [installResult, setInstallResult] = useState<{ success: boolean; error?: string } | null>(null);

  // Load environment checks on mount
  useEffect(() => {
    fetch("/api/install")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setLoading(false);
          return;
        }
        setChecks(data.checks || []);
        setCsrf(data.csrf || "");
        setLoading(false);
      })
      .catch(() => {
        setError("ارتباط با سرور برقرار نشد.");
        setLoading(false);
      });
  }, []);

  function update<K extends keyof Config>(key: K, value: Config[K]) {
    setConfig((c) => ({ ...c, [key]: value }));
  }

  function canProceed(): boolean {
    switch (step) {
      case 0: // Environment
        return checks.every((c) => c.status !== "fail");
      case 1: // Database
        if (config.dbType === "sqlite") return true;
        return !!dbTestResult?.success;
      case 2: // Admin
        return (
          config.adminName.trim().length >= 3 &&
          config.adminPhone.length >= 11 &&
          config.adminPassword.length >= 8 &&
          config.adminPassword === config.adminPasswordConfirm
        );
      case 3: // Site
        return !!config.siteUrl.trim() && !!config.siteTitle.trim();
      case 4: // Security
        return config.sessionSecret.length >= 32;
      default:
        return true;
    }
  }

  // Generate session secret
  function regenerateSecret() {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    const hex = Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
    update("sessionSecret", hex);
  }

  // Test DB connection
  async function testDb() {
    setDbTestResult(null);
    setError(null);
    try {
      const res = await fetch("/api/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csrf,
          action: "test-db",
          dbType: config.dbType,
          postgres: config.dbType === "postgres" ? config.postgres : undefined,
        }),
      });
      const data = await res.json();
      setDbTestResult(data);
    } catch {
      setDbTestResult({ success: false, error: "ارتباط برقرار نشد." });
    }
  }

  // Run installation
  async function runInstall() {
    setInstalling(true);
    setError(null);
    setInstallResult(null);
    setInstallSteps([]);

    try {
      const res = await fetch("/api/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csrf,
          action: "install",
          dbType: config.dbType,
          postgres: config.dbType === "postgres" ? config.postgres : undefined,
          adminName: config.adminName,
          adminPhone: config.adminPhone,
          adminPassword: config.adminPassword,
          siteUrl: config.siteUrl,
          siteTitle: config.siteTitle,
          contactEmail: config.contactEmail,
          sessionSecret: config.sessionSecret,
          seedCourses: config.seedCourses,
        }),
      });
      const data = await res.json();
      setInstallSteps(data.steps || []);
      setInstallResult({ success: data.success, error: data.error });
      if (data.success) {
        setStep(5); // Done
        // بعد از ۵ ثانیه، به صفحه ورود هدایت کن
        // (این به کاربر فرصت می‌دهد خلاصه را ببیند)
        // اما چون page.tsx در رندر بعدی هدایت می‌شود،
        // این تایمر فقط در صورتی کار می‌کند که صفحه رفرش نشود.
        // برای امنیت، این رفتار قابل قبول است — نصب‌کننده باید قفل شود.
      } else {
        setError(data.error || "نصب ناموفق بود.");
      }
    } catch {
      setError("ارتباط برقرار نشد.");
    } finally {
      setInstalling(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[100svh] flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && step === 0) {
    return (
      <div className="min-h-[100svh] flex items-center justify-center px-5">
        <div className="max-w-md text-center">
          <AlertTriangle className="size-10 mx-auto text-amber-600 mb-4" />
          <h1 className="text-xl font-medium mb-2">خطا</h1>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => router.push("/login")}
            className="inline-flex min-h-[44px] items-center rounded-md bg-foreground text-background px-6 text-sm font-medium"
          >
            ورود
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-md bg-foreground text-background font-bold text-lg">
              ن
            </span>
            <div>
              <div className="text-sm font-medium">آکادمی نیله</div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">ویزارد نصب</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">نسخه ۱.۰</div>
        </div>
      </header>

      <div className="flex-1 mx-auto max-w-3xl w-full px-5 sm:px-8 py-8 sm:py-12">
        {/* Step indicator */}
        <div className="flex items-center justify-between mb-10">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`grid size-8 place-items-center rounded-full text-xs font-medium transition-colors ${
                    i < step
                      ? "bg-foreground text-background"
                      : i === step
                      ? "bg-foreground text-background ring-4 ring-foreground/10"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {i < step ? <Check className="size-4" /> : i + 1}
                </div>
                <span className={`text-[10px] ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-2 ${i < step ? "bg-foreground" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        {step === 0 && <StepEnv checks={checks} />}
        {step === 1 && (
          <StepDb
            config={config}
            update={update}
            testDb={testDb}
            dbTestResult={dbTestResult}
          />
        )}
        {step === 2 && <StepAdmin config={config} update={update} />}
        {step === 3 && <StepSite config={config} update={update} />}
        {step === 4 && (
          <StepSecurity
            config={config}
            update={update}
            regenerateSecret={regenerateSecret}
          />
        )}
        {step === 5 && installResult && (
          <StepDone config={config} installResult={installResult} />
        )}

        {/* Error display */}
        {error && step !== 0 && (
          <div className="mt-6 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Navigation */}
        {step < 5 && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="flex min-h-[44px] items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
            >
              <ArrowRight className="size-4 rtl:-scale-x-100" />
              قبلی
            </button>

            {step === 4 ? (
              <button
                onClick={runInstall}
                disabled={!canProceed() || installing}
                className="flex min-h-[48px] items-center gap-2 bg-foreground text-background rounded-md px-6 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {installing ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
                {installing ? "در حال نصب..." : "شروع نصب"}
              </button>
            ) : (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex min-h-[48px] items-center gap-2 bg-foreground text-background rounded-md px-6 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                بعدی
                <ArrowLeft className="size-4 rtl:-scale-x-100" />
              </button>
            )}
          </div>
        )}

        {/* Installation progress (step 4 → 5 transition) */}
        {installing && installSteps.length > 0 && (
          <div className="mt-6 space-y-2">
            {installSteps.map((s, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                {s.status === "done" && <CheckCircle2 className="size-4 text-emerald-600" />}
                {s.status === "running" && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                {s.status === "pending" && <div className="size-4 rounded-full border border-border" />}
                {s.status === "failed" && <X className="size-4 text-destructive" />}
                <span className={s.status === "done" ? "text-foreground" : "text-muted-foreground"}>{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Step 0: Environment ──

function StepEnv({ checks }: { checks: EnvCheck[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-medium tracking-tight mb-2">به نصب‌کننده خوش آمدید</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          این ویزارد شما را در مراحل نصب آکادمی نیله راهنمایی می‌کند — از پیکربندی دیتابیس تا
          ساخت حساب ادمین. در پایان، سایت شما آماده استفاده خواهد بود.
        </p>
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-3">بررسی محیط</h3>
        <ul className="space-y-2">
          {checks.map((c) => (
            <li key={c.name} className="flex items-center gap-3 p-3 rounded-md border border-border bg-card">
              {c.status === "ok" && <Check className="size-4 text-emerald-600 shrink-0" />}
              {c.status === "warn" && <AlertTriangle className="size-4 text-amber-600 shrink-0" />}
              {c.status === "fail" && <X className="size-4 text-destructive shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{c.label}</div>
                <div className="text-xs text-muted-foreground">{c.detail}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Step 1: Database ──

function StepDb({
  config,
  update,
  testDb,
  dbTestResult,
}: {
  config: Config;
  update: <K extends keyof Config>(key: K, value: Config[K]) => void;
  testDb: () => void;
  dbTestResult: { success: boolean; message?: string; error?: string } | null;
}) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Database className="size-5 text-muted-foreground" />
          <h2 className="text-2xl font-medium tracking-tight">پیکربندی دیتابیس</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          نوع دیتابیس را انتخاب کنید. برای توسعه SQLite کافی است؛ برای سرور واقعی PostgreSQL پیشنهاد می‌شود.
        </p>
      </div>

      {/* DB type */}
      <div className="grid sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => update("dbType", "sqlite")}
          className={`flex min-h-[64px] items-start gap-3 p-4 rounded-md border text-start transition-colors ${
            config.dbType === "sqlite"
              ? "border-foreground bg-secondary"
              : "border-border hover:bg-secondary/40"
          }`}
        >
          <div className={`size-4 rounded-full border-2 mt-0.5 ${config.dbType === "sqlite" ? "border-foreground bg-foreground" : "border-border"}`} />
          <div>
            <div className="text-sm font-medium">SQLite</div>
            <div className="text-xs text-muted-foreground mt-0.5">توسعه — فایل محلی، بدون نیاز به سرور</div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => update("dbType", "postgres")}
          className={`flex min-h-[64px] items-start gap-3 p-4 rounded-md border text-start transition-colors ${
            config.dbType === "postgres"
              ? "border-foreground bg-secondary"
              : "border-border hover:bg-secondary/40"
          }`}
        >
          <div className={`size-4 rounded-full border-2 mt-0.5 ${config.dbType === "postgres" ? "border-foreground bg-foreground" : "border-border"}`} />
          <div>
            <div className="text-sm font-medium">PostgreSQL</div>
            <div className="text-xs text-muted-foreground mt-0.5">تولید — مقیاس‌پذیر و امن</div>
          </div>
        </button>
      </div>

      {/* SQLite info */}
      {config.dbType === "sqlite" && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="size-4 inline me-2" />
          دیتابیس SQLite در مسیر <code dir="ltr">db/neeleh.db</code> ایجاد می‌شود. نیازی به پیکربندی اضافه نیست.
        </div>
      )}

      {/* PostgreSQL form */}
      {config.dbType === "postgres" && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="هاست">
              <input
                type="text"
                value={config.postgres.host}
                onChange={(e) => update("postgres", { ...config.postgres, host: e.target.value })}
                dir="ltr"
                placeholder="localhost"
                className="w-full bg-transparent border-b border-border py-3 text-sm outline-none focus:border-foreground min-h-[44px] text-start"
              />
            </Field>
            <Field label="پورت">
              <input
                type="text"
                value={config.postgres.port}
                onChange={(e) => update("postgres", { ...config.postgres, port: e.target.value })}
                dir="ltr"
                placeholder="5432"
                className="w-full bg-transparent border-b border-border py-3 text-sm tabular-nums outline-none focus:border-foreground min-h-[44px] text-start"
              />
            </Field>
          </div>
          <Field label="نام دیتابیس">
            <input
              type="text"
              value={config.postgres.database}
              onChange={(e) => update("postgres", { ...config.postgres, database: e.target.value })}
              dir="ltr"
              placeholder="neeleh"
              className="w-full bg-transparent border-b border-border py-3 text-sm outline-none focus:border-foreground min-h-[44px] text-start"
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="نام کاربری">
              <input
                type="text"
                value={config.postgres.user}
                onChange={(e) => update("postgres", { ...config.postgres, user: e.target.value })}
                dir="ltr"
                placeholder="neeleh"
                className="w-full bg-transparent border-b border-border py-3 text-sm outline-none focus:border-foreground min-h-[44px] text-start"
              />
            </Field>
            <Field label="رمز عبور">
              <input
                type="password"
                value={config.postgres.password}
                onChange={(e) => update("postgres", { ...config.postgres, password: e.target.value })}
                dir="ltr"
                placeholder="••••••••"
                className="w-full bg-transparent border-b border-border py-3 text-sm outline-none focus:border-foreground min-h-[44px] text-start"
              />
            </Field>
          </div>

          <button
            type="button"
            onClick={testDb}
            className="flex min-h-[44px] items-center gap-2 border border-border rounded-md px-5 text-sm hover:bg-secondary transition-colors"
          >
            <Database className="size-4" />
            تست اتصال
          </button>

          {dbTestResult && (
            <div
              className={`rounded-md p-3 text-sm ${
                dbTestResult.success
                  ? "border border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border border-destructive/40 bg-destructive/5 text-destructive"
              }`}
            >
              {dbTestResult.success ? (
                <>
                  <CheckCircle2 className="size-4 inline me-2" />
                  {dbTestResult.message || "اتصال موفق بود."}
                </>
              ) : (
                <>
                  <X className="size-4 inline me-2" />
                  {dbTestResult.error || "اتصال ناموفق بود."}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Step 2: Admin ──

function StepAdmin({
  config,
  update,
}: {
  config: Config;
  update: <K extends keyof Config>(key: K, value: Config[K]) => void;
}) {
  const [showPass, setShowPass] = useState(false);
  const strength = getStrength(config.adminPassword);
  const passwordsMatch = config.adminPassword === config.adminPasswordConfirm && config.adminPassword.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <User className="size-5 text-muted-foreground" />
          <h2 className="text-2xl font-medium tracking-tight">حساب ادمین</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          حساب مدیریت اصلی را بسازید. این حساب دسترسی کامل به پنل مدیریت خواهد داشت.
        </p>
      </div>

      <Field label="نام و نام خانوادگی">
        <input
          type="text"
          value={config.adminName}
          onChange={(e) => update("adminName", e.target.value)}
          placeholder="مثلاً مدیر آکادمی نیله"
          className="w-full bg-transparent border-b border-border py-3 text-sm outline-none focus:border-foreground min-h-[44px]"
        />
      </Field>

      <Field label="شماره موبایل (نام کاربری)">
        <input
          type="tel"
          inputMode="tel"
          value={config.adminPhone}
          onChange={(e) => update("adminPhone", e.target.value)}
          dir="ltr"
          placeholder="09123456789"
          className="w-full bg-transparent border-b border-border py-3 text-sm outline-none focus:border-foreground min-h-[44px] text-start"
        />
      </Field>

      <Field label="رمز عبور">
        <div className="relative">
          <input
            type={showPass ? "text" : "password"}
            value={config.adminPassword}
            onChange={(e) => update("adminPassword", e.target.value)}
            dir="ltr"
            placeholder="حداقل ۸ کاراکتر با حرف و عدد"
            className="w-full bg-transparent border-b border-border py-3 text-sm outline-none focus:border-foreground min-h-[44px] text-start pe-10"
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute end-0 top-1/2 -translate-y-1/2 flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground"
          >
            {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {config.adminPassword.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
              <div
                className={`h-full transition-all ${
                  strength === "weak" ? "w-1/3 bg-destructive" : strength === "medium" ? "w-2/3 bg-amber-500" : "w-full bg-emerald-500"
                }`}
              />
            </div>
            <span className={`text-xs ${strength === "weak" ? "text-destructive" : strength === "medium" ? "text-amber-600" : "text-emerald-600"}`}>
              {strength === "weak" ? "ضعیف" : strength === "medium" ? "متوسط" : "قوی"}
            </span>
          </div>
        )}
      </Field>

      <Field label="تکرار رمز عبور">
        <input
          type={showPass ? "text" : "password"}
          value={config.adminPasswordConfirm}
          onChange={(e) => update("adminPasswordConfirm", e.target.value)}
          dir="ltr"
          placeholder="رمز عبور را تکرار کنید"
          className={`w-full bg-transparent border-b py-3 text-sm outline-none min-h-[44px] text-start ${
            config.adminPasswordConfirm.length > 0 && !passwordsMatch
              ? "border-destructive focus:border-destructive"
              : "border-border focus:border-foreground"
          }`}
        />
        {config.adminPasswordConfirm.length > 0 && !passwordsMatch && (
          <p className="mt-1 text-xs text-destructive">رمز عبور هم‌خوانی ندارد.</p>
        )}
      </Field>
    </div>
  );
}

function getStrength(pass: string): "weak" | "medium" | "strong" {
  if (pass.length < 8) return "weak";
  const hasLetter = /[a-zA-Z]/.test(pass);
  const hasNumber = /\d/.test(pass);
  const hasSpecial = /[^a-zA-Z0-9]/.test(pass);
  const hasUpper = /[A-Z]/.test(pass);
  const hasLower = /[a-z]/.test(pass);
  if (pass.length >= 12 && hasUpper && hasLower && hasNumber && hasSpecial) return "strong";
  if (pass.length >= 8 && ((hasUpper && hasLower) || hasSpecial) && hasNumber) return "medium";
  if (pass.length >= 8 && hasLetter && hasNumber) return "medium";
  return "weak";
}

// ── Step 3: Site ──

function StepSite({
  config,
  update,
}: {
  config: Config;
  update: <K extends keyof Config>(key: K, value: Config[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Globe className="size-5 text-muted-foreground" />
          <h2 className="text-2xl font-medium tracking-tight">تنظیمات سایت</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          اطلاعات اصلی سایت را وارد کنید. این مقادیر بعداً از پنل مدیریت قابل تغییر هستند.
        </p>
      </div>

      <Field label="آدرس سایت (URL)">
        <input
          type="text"
          value={config.siteUrl}
          onChange={(e) => update("siteUrl", e.target.value)}
          dir="ltr"
          placeholder="https://neeleh.academy"
          className="w-full bg-transparent border-b border-border py-3 text-sm outline-none focus:border-foreground min-h-[44px] text-start"
        />
      </Field>

      <Field label="عنوان سایت">
        <input
          type="text"
          value={config.siteTitle}
          onChange={(e) => update("siteTitle", e.target.value)}
          placeholder="آکادمی نیله"
          className="w-full bg-transparent border-b border-border py-3 text-sm outline-none focus:border-foreground min-h-[44px]"
        />
      </Field>

      <Field label="ایمیل تماس (اختیاری)">
        <input
          type="email"
          value={config.contactEmail}
          onChange={(e) => update("contactEmail", e.target.value)}
          dir="ltr"
          placeholder="hello@neeleh.academy"
          className="w-full bg-transparent border-b border-border py-3 text-sm outline-none focus:border-foreground min-h-[44px] text-start"
        />
      </Field>

      <label className="flex min-h-[44px] items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={config.seedCourses}
          onChange={(e) => update("seedCourses", e.target.checked)}
          className="size-4 accent-foreground"
        />
        <span className="text-sm">بارگذاری ۹ دوره پیش‌فرض آکادمی نیله</span>
      </label>
    </div>
  );
}

// ── Step 4: Security ──

function StepSecurity({
  config,
  update,
  regenerateSecret,
}: {
  config: Config;
  update: <K extends keyof Config>(key: K, value: Config[K]) => void;
  regenerateSecret: () => void;
}) {
  const [copied, setCopied] = useState(false);

  // Auto-generate on mount if empty
  useEffect(() => {
    if (!config.sessionSecret) {
      regenerateSecret();
    }
  }, []);

  function copySecret() {
    navigator.clipboard.writeText(config.sessionSecret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Lock className="size-5 text-muted-foreground" />
          <h2 className="text-2xl font-medium tracking-tight">امنیت</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          کلید امضای نشست به‌صورت خودکار با ۲۵۶ بیت تصادفی تولید شده است. این کلید برای
          امنیت کوکی‌ها و نشست‌های کاربران ضروری است.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            SESSION_SECRET (۲۵۶ بیت)
          </label>
          <button
            type="button"
            onClick={regenerateSecret}
            className="flex min-h-[36px] items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="size-3" />
            تولید مجدد
          </button>
        </div>
        <div className="flex items-center gap-2 bg-card border border-border rounded-md p-3">
          <code dir="ltr" className="flex-1 text-xs font-mono break-all">
            {config.sessionSecret || "..."}
          </code>
          <button
            type="button"
            onClick={copySecret}
            className="flex min-h-[36px] min-w-[36px] items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
          </button>
        </div>
      </div>

      {/* Security checklist */}
      <div className="rounded-md border border-border bg-card p-5 space-y-3">
        <h3 className="text-xs uppercase tracking-[0.14em] text-muted-foreground">اقدامات امنیتی</h3>
        <ul className="space-y-2 text-sm">
          {[
            "فایل .env با مجوز ۰۶۰۰ ایجاد می‌شود (فقط مالک دسترسی دارد).",
            "رمز عبور با scrypt + salt تصادفی هش می‌شود.",
            "نشست‌ها در دیتابیس ذخیره می‌شوند — قابل ابطال فوری.",
            "پس از نصب، فایل .installed ایجاد می‌شود و ویزارد قفل می‌شود.",
            "CSRF token در همه فرم‌ها اعمال می‌شود.",
            "Rate limiting روی ورود و API فعال است.",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <Shield className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* HTTPS warning */}
      {config.siteUrl.startsWith("http://") && !config.siteUrl.includes("localhost") && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle className="size-4 inline me-2" />
          آدرس سایت HTTP است. برای تولید، HTTPS پیشنهاد می‌شود.
        </div>
      )}
    </div>
  );
}

// ── Step 5: Done ──

function StepDone({
  config,
  installResult,
}: {
  config: Config;
  installResult: { success: boolean; error?: string };
}) {
  const router = useRouter();

  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="size-8" />
      </div>

      <div>
        <h2 className="text-2xl font-medium tracking-tight mb-2">نصب کامل شد! 🎉</h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
          آکادمی نیله با موفقیت نصب شد. شما اکنون می‌توانید وارد پنل مدیریت شوید.
        </p>
      </div>

      <div className="rounded-md border border-border bg-card p-5 text-start space-y-2 max-w-md mx-auto">
        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">خلاصه</div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">نام ادمین:</span>
          <span className="font-medium">{config.adminName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">شماره موبایل:</span>
          <span dir="ltr" className="font-medium">{config.adminPhone}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">دیتابیس:</span>
          <span className="font-medium">{config.dbType === "sqlite" ? "SQLite" : "PostgreSQL"}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">آدرس سایت:</span>
          <span dir="ltr" className="font-medium">{config.siteUrl}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={() => router.push("/login")}
          className="flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2 bg-foreground text-background rounded-md px-8 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          ورود به پنل مدیریت
          <ArrowLeft className="size-4 rtl:-scale-x-100" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        برای امنیت، ویزارد نصب قفل شده است. برای نصب مجدد، فایل <code dir="ltr">.installed</code> را حذف کنید.
      </p>
    </div>
  );
}

// ── Reusable Field ──

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">{label}</label>
      {children}
    </div>
  );
}
