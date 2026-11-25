import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { normalizePhone, isValidPhone } from "@/lib/format";
import { apiMsg } from "@/lib/i18n";
import { checkSlidingRateLimit, extractClientIp } from "@/lib/security";

type Body = { phone?: string; password?: string };

export async function POST(req: NextRequest) {
  try {
    const ip = extractClientIp(req.headers);
    const ipLimit = checkSlidingRateLimit("login-ip", ip, 12, 10 * 60 * 1000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        {
          error: await apiMsg(
            "تعداد تلاش‌های ورود بیش از حد مجاز است. دقایقی بعد دوباره تلاش کنید.",
            "Too many login attempts. Please try again in a few minutes.",
          ),
        },
        {
          status: 429,
          headers: { "Retry-After": String(ipLimit.retryAfterSec) },
        },
      );
    }

    let body: Body;
    try {
      body = (await req.json()) as Body;
    } catch {
      return NextResponse.json(
        { error: await apiMsg("بدنه درخواست نامعتبر است", "Invalid request body") },
        { status: 400 },
      );
    }

    const phone = normalizePhone(body.phone ?? "");
    const password = String(body.password ?? "");

    if (!isValidPhone(phone)) {
      return NextResponse.json(
        { error: await apiMsg("شماره موبایل معتبر نیست (مثال: ۰۹۱۲۱۲۳۴۵۶۷)", "Invalid mobile number (e.g. 09121234567)") },
        { status: 400 }
      );
    }
    if (!password || password.length < 1 || password.length > 256) {
      return NextResponse.json(
        { error: await apiMsg("رمز عبور را وارد کنید", "Please enter your password") },
        { status: 400 }
      );
    }

    const phoneLimit = checkSlidingRateLimit("login-phone", phone, 8, 10 * 60 * 1000);
    if (!phoneLimit.allowed) {
      return NextResponse.json(
        {
          error: await apiMsg(
            "تعداد تلاش‌های ناموفق برای این شماره زیاد است. چند دقیقه صبر کنید.",
            "Too many sign-in attempts for this account. Please wait a few minutes.",
          ),
        },
        {
          status: 429,
          headers: { "Retry-After": String(phoneLimit.retryAfterSec) },
        },
      );
    }

    const user = await db.user.findUnique({
      where: { phone },
      include: {
        userRoles: {
          select: {
            role: { select: { name: true } },
          },
        },
      },
    });
    if (!user || !verifyPassword(password, user.password)) {
      return NextResponse.json(
        { error: await apiMsg("شماره یا رمز عبور اشتباه است", "Wrong phone number or password") },
        { status: 401 }
      );
    }

    await setSessionCookie(user.id);

    const roles = user.userRoles.map((ur) => ur.role.name);
    const redirect =
      roles.includes("ADMIN") || roles.includes("EDITOR")
        ? "/dashboard"
        : "/panel";

    return NextResponse.json({
      user: { id: user.id, name: user.name, phone: user.phone, roles },
      redirect,
    });
  } catch (e) {
    console.error("login error", e);
    return NextResponse.json(
      { error: await apiMsg("خطای غیرمنتظره در ورود", "Unexpected error during sign-in") },
      { status: 500 }
    );
  }
}
