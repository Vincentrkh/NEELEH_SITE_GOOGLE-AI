import { existsSync, writeFileSync, mkdirSync, accessSync, constants, readFileSync } from "fs";
import path from "path";
import { execSync } from "child_process";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { PrismaClient } from "@prisma/client";
import { ALL_PERMISSIONS } from "./permissions";

/**
 * Installer — ویزارد نصب CMS آکادمی نیله.
 *
 * امنیت:
 * ۱) فایل `.installed` به‌عنوان مارکر نصب — اگر وجود داشت، installer قفل می‌شود.
 * ۲) CSRF token در کوکی + فرم (HMAC-SHA256).
 * ۳) Rate limiting در حافظه (۵ تلاش در ۱۰ دقیقه per IP).
 * ۴) اعتبارسنجی ورودی (موبایل ایرانی، رمز قوی، ایمیل).
 * ۵) SESSION_SECRET با ۲۵۶ بیت تصادفی (crypto.randomBytes).
 * ۶) فایل .env با مجوز ۰۶۰۰ (فقط مالک خواندن/نوشتن).
 * ۷) هشدار HTTPS در تولید.
 */

const INSTALL_MARKER = path.join(process.cwd(), ".installed");
const ENV_FILE = path.join(process.cwd(), ".env");
const DB_DIR = path.join(process.cwd(), "db");
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

// ── Rate limiting در حافظه ──
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // ۱۰ دقیقه
const RATE_LIMIT_MAX = 5; // ۵ تلاش

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const attempts = rateLimitMap.get(ip) ?? [];
  const recent = attempts.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) return false;
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return true;
}

// ── CSRF token ──
const CSRF_COOKIE = "neeleh_csrf";

const globalInstallerSecret = globalThis as unknown as {
  __neelehInstallerCsrfSecret?: string;
};

function csrfSecret(): string {
  const envSecret = process.env.SESSION_SECRET?.trim();
  if (envSecret && envSecret.length >= 16) return envSecret;
  if (!globalInstallerSecret.__neelehInstallerCsrfSecret) {
    globalInstallerSecret.__neelehInstallerCsrfSecret = randomBytes(32).toString("hex");
  }
  return globalInstallerSecret.__neelehInstallerCsrfSecret;
}

export function generateCsrfToken(): string {
  const payload = randomBytes(16).toString("hex");
  const sig = createHmac("sha256", csrfSecret())
    .update(payload)
    .digest("hex");
  return `${payload}.${sig}`;
}

export function verifyCsrfToken(token: string): boolean {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = createHmac("sha256", csrfSecret())
    .update(payload)
    .digest("hex");
  if (sig.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export { CSRF_COOKIE };

// ── نصب شده؟ ──

export function isInstalled(): boolean {
  return existsSync(INSTALL_MARKER);
}

export function getInstallInfo(): { installedAt: string } | null {
  if (!existsSync(INSTALL_MARKER)) return null;
  try {
    return JSON.parse(readFileSync(INSTALL_MARKER, "utf-8"));
  } catch {
    return { installedAt: "unknown" };
  }
}

// ── بررسی محیط ──

export type EnvCheck = {
  name: string;
  label: string;
  status: "ok" | "warn" | "fail";
  detail: string;
};

export function checkEnvironment(): EnvCheck[] {
  const checks: EnvCheck[] = [];

  // Node version
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.slice(1));
  checks.push({
    name: "node",
    label: "نسخه Node.js",
    status: major >= 18 ? "ok" : "fail",
    detail: `${nodeVersion} (حداقل ۱۸ لازم است)`,
  });

  // DB directory
  try {
    if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });
    accessSync(DB_DIR, constants.W_OK);
    checks.push({ name: "db-dir", label: "دایرکتوری دیتابیس", status: "ok", detail: "db/ قابل نوشتن" });
  } catch {
    checks.push({ name: "db-dir", label: "دایرکتوری دیتابیس", status: "fail", detail: "db/ قابل نوشتن نیست" });
  }

  // Uploads directory
  try {
    if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });
    accessSync(UPLOADS_DIR, constants.W_OK);
    checks.push({ name: "uploads-dir", label: "دایرکتوری آپلود", status: "ok", detail: "public/uploads/ قابل نوشتن" });
  } catch {
    checks.push({ name: "uploads-dir", label: "دایرکتوری آپلود", status: "fail", detail: "public/uploads/ قابل نوشتن نیست" });
  }

  // .env writable
  try {
    if (existsSync(ENV_FILE)) {
      accessSync(ENV_FILE, constants.W_OK);
    } else {
      accessSync(process.cwd(), constants.W_OK);
    }
    checks.push({ name: "env", label: "فایل تنظیمات (.env)", status: "ok", detail: existsSync(ENV_FILE) ? "قابل نوشتن" : "قابل ایجاد" });
  } catch {
    checks.push({ name: "env", label: "فایل تنظیمات (.env)", status: "fail", detail: "قابل نوشتن نیست" });
  }

  // Prisma schema
  const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
  checks.push({
    name: "schema",
    label: "Prisma Schema",
    status: existsSync(schemaPath) ? "ok" : "fail",
    detail: existsSync(schemaPath) ? "موجود" : "یافت نشد",
  });

  // Node/npm available (bun removed for Node.js compatibility)
  try {
    execSync("npx --version", { stdio: "pipe" });
    checks.push({ name: "npx", label: "npx CLI", status: "ok", detail: "موجود" });
  } catch {
    checks.push({ name: "npx", label: "npx CLI", status: "warn", detail: "پیشنهاد می‌شود نصب شود" });
  }

  // HTTPS check (in production)
  if (process.env.NODE_ENV === "production") {
    const https = process.env.HTTPS === "on" || process.env.HTTP_X_FORWARDED_PROTO === "https";
    checks.push({
      name: "https",
      label: "HTTPS",
      status: https ? "ok" : "warn",
      detail: https ? "فعال" : "پیشنهاد می‌شود فعال شود",
    });
  }

  return checks;
}

// ── تولید SESSION_SECRET ──

export function generateSessionSecret(): string {
  return randomBytes(32).toString("hex"); // ۲۵۶ بیت
}

// ─ـ هش رمز عبور ──

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

// ── اعتبارسنجی ورودی ──

export function validatePhone(phone: string): { valid: boolean; normalized: string; error?: string } {
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  const ar = "٠١٢٣٤٥٦٧٨٩";
  let s = phone.trim();
  s = s.replace(/[۰-۹]/g, (d) => String(fa.indexOf(d)));
  s = s.replace(/[٠-٩]/g, (d) => String(ar.indexOf(d)));
  s = s.replace(/[^\d+]/g, "").replace(/^\+98/, "0");
  if (/^9\d{9}$/.test(s)) s = "0" + s;
  if (!/^09\d{9}$/.test(s)) {
    return { valid: false, normalized: s, error: "شماره موبایل معتبر نیست (مثال: ۰۹۱۲۱۲۳۴۵۶۷)" };
  }
  return { valid: true, normalized: s };
}

export type PasswordStrength = "weak" | "medium" | "strong";

export function checkPasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) return "weak";
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  
  if (password.length >= 12 && hasUpper && hasLower && hasNumber && hasSpecial) return "strong";
  if (password.length >= 8 && ((hasUpper && hasLower) || hasSpecial) && hasNumber) return "medium";
  if (password.length >= 8 && hasLetter && hasNumber) return "medium";
  return "weak";
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── ساخت DATABASE_URL ──

export type InstallConfig = {
  dbType: "sqlite" | "postgres";
  postgres?: { host: string; port: string; database: string; user: string; password: string };
  adminName: string;
  adminPhone: string;
  adminPassword: string;
  siteUrl: string;
  siteTitle: string;
  contactEmail: string;
  sessionSecret: string;
  seedCourses: boolean;
};

export function buildDatabaseUrl(config: InstallConfig): string {
  if (config.dbType === "sqlite") {
    return `file:${path.join(process.cwd(), "db", "neeleh.db")}`;
  }
  const pg = config.postgres!;
  const safeHost = pg.host.trim();
  const safePort = String(pg.port || "5432").trim();
  const safeDb = pg.database.trim();
  if (!/^[a-zA-Z0-9._-]+$/.test(safeHost) || !/^\d{1,5}$/.test(safePort) || !/^[a-zA-Z0-9_-]+$/.test(safeDb)) {
    throw new Error("Invalid PostgreSQL connection parameters");
  }
  return `postgresql://${encodeURIComponent(pg.user)}:${encodeURIComponent(pg.password)}@${safeHost}:${safePort}/${safeDb}?schema=public`;
}

// ── تست اتصال دیتابیس ──

export async function testDatabaseConnection(databaseUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await db.$connect();
    await db.$disconnect();
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg.slice(0, 200) };
  }
}

// ── نوشتن .env ──

export function writeEnvFile(config: InstallConfig, databaseUrl: string): void {
  const safeUrl = config.siteUrl.replace(/[\r\n"]/g, "");
  const content = [
    `# آکادمی نیله — تولیدشده توسط Installer در ${new Date().toISOString()}`,
    `DATABASE_URL="${databaseUrl}"`,
    `SESSION_SECRET="${config.sessionSecret}"`,
    `NEXT_PUBLIC_SITE_URL="${safeUrl}"`,
    "",
  ].join("\n");
  writeFileSync(ENV_FILE, content, { mode: 0o600 }); // فقط مالک
}

// ── اجرای migration ──

export function runMigrations(databaseUrl: string): { success: boolean; output: string } {
  const env = { ...process.env, DATABASE_URL: databaseUrl };
  try {
    const out1 = execSync("npx prisma generate 2>&1", { cwd: process.cwd(), env, encoding: "utf-8", timeout: 60000 });
    const out2 = execSync("npx prisma db push --accept-data-loss 2>&1", { cwd: process.cwd(), env, encoding: "utf-8", timeout: 60000 });
    return { success: true, output: out1 + out2 };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, output: msg.slice(0, 500) };
  }
}

// ── اجرای seed ──

export async function runSeed(config: InstallConfig, databaseUrl: string): Promise<void> {
  const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

  try {
    // ۱) مجوزها
    for (const p of ALL_PERMISSIONS) {
      await db.permission.upsert({
        where: { key: p.key },
        update: { label: p.label },
        create: { key: p.key, label: p.label },
      });
    }

    // ۲) نقش‌ها
    const roles = [
      { name: "ADMIN", label: "ادمین کل", description: "دسترسی کامل به همه بخش‌ها", isSystem: true },
      { name: "EDITOR", label: "ویراستار محتوا", description: "مدیریت دوره‌ها و مقالات", isSystem: true },
      { name: "STUDENT", label: "هنرجو", description: "دسترسی به پنل هنرجو", isSystem: true },
    ];
    for (const r of roles) {
      await db.role.upsert({ where: { name: r.name }, update: r, create: r });
    }

    const allPerms = await db.permission.findMany();
    const adminRole = await db.role.findUnique({ where: { name: "ADMIN" } });
    const editorRole = await db.role.findUnique({ where: { name: "EDITOR" } });
    const studentRole = await db.role.findUnique({ where: { name: "STUDENT" } });

    if (adminRole) {
      for (const p of allPerms) {
        await db.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: adminRole.id, permissionId: p.id } },
          update: {},
          create: { roleId: adminRole.id, permissionId: p.id },
        });
      }
    }
    if (editorRole) {
      const editorPerms = allPerms.filter((p) =>
        ["course.", "post.", "comment.", "page.", "file.", "lead.view", "registration.view"].some((prefix) => p.key.startsWith(prefix))
      );
      for (const p of editorPerms) {
        await db.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: editorRole.id, permissionId: p.id } },
          update: {},
          create: { roleId: editorRole.id, permissionId: p.id },
        });
      }
    }
    if (studentRole) {
      const panelPerm = allPerms.find((p) => p.key === "panel.view");
      if (panelPerm) {
        await db.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: studentRole.id, permissionId: panelPerm.id } },
          update: {},
          create: { roleId: studentRole.id, permissionId: panelPerm.id },
        });
      }
    }

    // ۳) کاربر ادمین
    const admin = await db.user.upsert({
      where: { phone: config.adminPhone },
      update: { name: config.adminName, password: hashPassword(config.adminPassword), email: config.contactEmail || null },
      create: {
        phone: config.adminPhone,
        name: config.adminName,
        password: hashPassword(config.adminPassword),
        email: config.contactEmail || null,
        bio: "بنیان‌گذار و مدرس ارشد آکادمی نیله.",
      },
    });
    if (adminRole) {
      await db.userRole.upsert({
        where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
        update: {},
        create: { userId: admin.id, roleId: adminRole.id },
      });
    }

    // ۴) تم پیش‌فرض
    await db.themeSetting.deleteMany({});
    await db.themeSetting.create({
      data: {
        isActive: true,
        backgroundColor: "#fafaf7",
        foregroundColor: "#1a1a18",
        primaryColor: "#1f1f1c",
        accentColor: "#a8632c",
        mutedColor: "#8a8a85",
        fontHeading: "Estedad Var",
        fontBody: "Vazirmatn Var",
        radius: "0.75rem",
        mode: "LIGHT",
        customCss: "",
      },
    });

    // ۵) تنظیمات محتوا
    const settings = [
      { key: "hero.title", value: config.siteTitle, label: "عنوان اصلی" },
      { key: "hero.subtitle", value: "سیستم‌های هوشمند معماری و آموزش عصر AI", label: "زیرعنوان" },
      { key: "hero.tagline", value: "معماری را فراتر از ابزارها یاد بگیرید", label: "شعار" },
      { key: "hero.intro", value: "استودیوی تخصصی نیله، با تکیه بر تجربه حرفه‌ای و تسلط بر ابزارهای نوین طراحی محاسباتی، مدلسازی اطلاعات ساختمان (BIM) و هوش مصنوعی، مسیر نوین یادگیری و ارتقای مهندسی معماری را ترسیم می‌کند.", label: "معرفی" },
      { key: "contact.phone", value: config.adminPhone, label: "تلفن" },
      { key: "contact.email", value: config.contactEmail, label: "ایمیل" },
      { key: "contact.address", value: "دامغان — محل برگزاری کلاس‌های حضوری آکادمی نیله", label: "آدرس" },
      { key: "contact.hours", value: "شنبه تا چهارشنبه، ۹ تا ۱۸", label: "ساعات کاری" },
      { key: "stats.years", value: "۲۶+", label: "سال تجربه" },
      { key: "stats.courses", value: "۹", label: "تعداد دوره" },
      { key: "stats.graduates", value: "۳۰۰+", label: "فارغ‌التحصیلان" },
    ];
    for (const s of settings) {
      await db.setting.upsert({ where: { key: s.key }, update: {}, create: s });
    }

    // ۶) دوره‌ها (اختیاری)
    if (config.seedCourses) {
      // اجرای seed-courses.ts با env جدید
      const env = { ...process.env, DATABASE_URL: databaseUrl };
      try {
        execSync("npx tsx scripts/seed-courses.ts 2>&1", { cwd: process.cwd(), env, encoding: "utf-8", timeout: 30000 });
      } catch {
        // اگر شکست خورد، ادامه می‌دهیم — دوره‌ها را می‌توان بعداً اضافه کرد
      }
    }

    await db.$disconnect();
  } catch (e) {
    await db.$disconnect();
    throw e;
  }
}

// ── ایجاد مارکر نصب ──

export function createInstallMarker(): void {
  writeFileSync(
    INSTALL_MARKER,
    JSON.stringify({ installedAt: new Date().toISOString(), version: "1.0.0" }),
    { mode: 0o600 }
  );
}

// ── اجرای کامل نصب ──

export type InstallStep = { name: string; label: string; status: "pending" | "running" | "done" | "failed"; detail?: string };

export async function runInstallation(config: InstallConfig): Promise<{ success: boolean; steps: InstallStep[]; error?: string }> {
  const steps: InstallStep[] = [
    { name: "env", label: "نوشتن فایل .env", status: "pending" },
    { name: "migrate", label: "ایجاد ساختار دیتابیس", status: "pending" },
    { name: "seed", label: "ساخت ادمین، نقش‌ها و تنظیمات", status: "pending" },
    { name: "courses", label: "بارگذاری دوره‌های پیش‌فرض", status: "pending" },
    { name: "lock", label: "قفل‌گذاری نصب", status: "pending" },
  ];

  try {
    // ۱) ساخت DATABASE_URL
    const databaseUrl = buildDatabaseUrl(config);

    // ۲) نوشتن .env
    steps[0].status = "running";
    writeEnvFile(config, databaseUrl);
    steps[0].status = "done";

    // ۳) Migration
    steps[1].status = "running";
    const mig = runMigrations(databaseUrl);
    if (!mig.success) {
      steps[1].status = "failed";
      steps[1].detail = mig.output;
      return { success: false, steps, error: "خطا در ایجاد ساختار دیتابیس" };
    }
    steps[1].status = "done";

    // ۴) Seed
    steps[2].status = "running";
    try {
      await runSeed(config, databaseUrl);
      steps[2].status = "done";
    } catch (e) {
      steps[2].status = "failed";
      steps[2].detail = e instanceof Error ? e.message : String(e);
      return { success: false, steps, error: "خطا در ساخت داده‌های اولیه" };
    }

    // ۵) Courses (already done in seed if seedCourses is true)
    steps[3].status = config.seedCourses ? "done" : "pending";
    if (!config.seedCourses) {
      steps[3].label = "بارگذاری دوره‌ها (رد شد)";
    }

    // ۶) Lock
    steps[4].status = "running";
    createInstallMarker();
    steps[4].status = "done";

    return { success: true, steps };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, steps, error: msg };
  }
}
