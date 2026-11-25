import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  checkEnvironment,
  isInstalled,
  checkRateLimit,
  generateCsrfToken,
  verifyCsrfToken,
  testDatabaseConnection,
  runInstallation,
  validatePhone,
  validateEmail,
  checkPasswordStrength,
  generateSessionSecret,
  buildDatabaseUrl,
  CSRF_COOKIE,
  type InstallConfig,
} from "@/lib/installer";

async function isSystemLocked(): Promise<boolean> {
  if (isInstalled()) return true;
  try {
    const userCount = await db.user.count();
    return userCount > 0;
  } catch {
    return false;
  }
}

/**
 * GET /api/install — وضعیت نصب + بررسی محیط + CSRF token
 * POST /api/install — اجرای نصب یا تست دیتابیس
 *
 * امنیت:
 * - اگر نصب کامل شده، خطای 403 برمی‌گرداند.
 * - Rate limiting: ۵ تلاش در ۱۰ دقیقه per IP.
 * - CSRF token در کوکی + فرم.
 * - اعتبارسنجی ورودی‌ها.
 */

export async function GET() {
  // اگر نصب شده یا دیتابیس دارای کاربر است، دسترسی مسدود
  if (await isSystemLocked()) {
    return NextResponse.json(
      { error: "نصب قبلاً انجام شده است." },
      { status: 403 }
    );
  }

  const checks = checkEnvironment();

  // تولید CSRF token در کوکی
  const csrf = generateCsrfToken();
  const jar = await cookies();
  jar.set(CSRF_COOKIE, csrf, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 30, // ۳۰ دقیقه
    secure: process.env.NODE_ENV === "production",
  });

  return NextResponse.json({ installed: false, checks, csrf });
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  // اگر نصب شده یا دیتابیس دارای کاربر است، مسدود
  if (await isSystemLocked()) {
    return NextResponse.json(
      { error: "نصب قبلاً انجام شده است." },
      { status: 403 }
    );
  }

  // Rate limiting
  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "تعداد تلاش‌های شما بیش از حد مجاز است. ۱۰ دقیقه صبر کنید." },
      { status: 429 }
    );
  }

  // CSRF check
  const jar = await cookies();
  const cookieToken = jar.get(CSRF_COOKIE)?.value;
  const body = (await req.json()) as { csrf?: string; action?: string; [k: string]: unknown };
  if (!cookieToken || !body.csrf || !verifyCsrfToken(body.csrf) || body.csrf !== cookieToken) {
    return NextResponse.json({ error: "توکن امنیتی نامعتبر است. صفحه را بازخوانی کنید." }, { status: 403 });
  }

  const action = body.action;

  // ── تست دیتابیس ──
  if (action === "test-db") {
    const dbType = body.dbType as string;
    if (dbType === "sqlite") {
      return NextResponse.json({ success: true, message: "SQLite در مسیر پروژه استفاده می‌شود — نیازی به تست نیست." });
    }
    if (dbType === "postgres") {
      const pg = body.postgres as InstallConfig["postgres"];
      if (!pg?.host || !pg?.database || !pg?.user) {
        return NextResponse.json({ success: false, error: "همه فیلدهای PostgreSQL را پر کنید." });
      }
      const config: InstallConfig = {
        dbType: "postgres",
        postgres: pg,
        adminName: "", adminPhone: "", adminPassword: "",
        siteUrl: "", siteTitle: "", contactEmail: "",
        sessionSecret: "", seedCourses: false,
      };
      const url = buildDatabaseUrl(config);
      const result = await testDatabaseConnection(url);
      return NextResponse.json(result);
    }
    return NextResponse.json({ success: false, error: "نوع دیتابیس نامعتبر است." });
  }

  // ── اجرای نصب ──
  if (action === "install") {
    const config = body as unknown as InstallConfig;

    // اعتبارسنجی
    const errors: string[] = [];

    if (!config.adminName?.trim() || config.adminName.trim().length < 3) {
      errors.push("نام ادمین باید حداقل ۳ کاراکتر باشد.");
    }

    const phoneCheck = validatePhone(config.adminPhone || "");
    if (!phoneCheck.valid) {
      errors.push(phoneCheck.error || "شماره موبایل نامعتبر است.");
    } else {
      config.adminPhone = phoneCheck.normalized;
    }

    const strength = checkPasswordStrength(config.adminPassword || "");
    if (strength === "weak") {
      errors.push("رمز عبور ضعیف است. حداقل ۸ کاراکتر با ترکیب حرف و عدد.");
    }

    if (config.contactEmail && !validateEmail(config.contactEmail)) {
      errors.push("ایمیل نامعتبر است.");
    }

    if (!config.siteUrl?.trim()) {
      config.siteUrl = "http://localhost:3000";
    }

    if (!config.sessionSecret || config.sessionSecret.length < 32) {
      config.sessionSecret = generateSessionSecret();
    }

    if (config.dbType === "postgres") {
      if (!config.postgres?.host || !config.postgres?.database || !config.postgres?.user) {
        errors.push("اطلاعات PostgreSQL ناقص است.");
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
    }

    // اجرای نصب
    const result = await runInstallation(config);

    if (result.success) {
      // پاک کردن CSRF cookie (دیگر نیازی نیست)
      jar.delete(CSRF_COOKIE);
    }

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  }

  return NextResponse.json({ error: "action نامعتبر است." }, { status: 400 });
}
