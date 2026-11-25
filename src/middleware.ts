import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware امنیتی و مسیریابی:
 * ۱) محافظت CSRF (بررسی Origin/Host و Sec-Fetch-Site) برای تمام درخواست‌های تغییردهنده وضعیت روی /api/*.
 * ۲) هدایت کاربر لاگین‌نشده از /dashboard و /panel به /login/ با بررسی امن ?next=.
 * ۳) پاک‌سازی کوکی نشست دارای ساختار نامعتبر.
 */

const COOKIE_NAME = "neeleh_session";
const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function hasValidCookieShape(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  if (!payload || !sig) return false;
  try {
    const json = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    ) as { uid?: string; iat?: number };
    if (!json.uid || !json.iat) return false;
    const TTL_MS = 60 * 60 * 24 * 30 * 1000; // ۳۰ روز
    if (Date.now() - json.iat > TTL_MS) return false;
    return true;
  } catch {
    return false;
  }
}

function getRequestHost(req: NextRequest): string {
  const rawHost =
    req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  return rawHost.split(",")[0]?.trim().toLowerCase() || "";
}

function isCrossOriginApiMutation(req: NextRequest): boolean {
  if (!STATE_CHANGING_METHODS.has(req.method.toUpperCase())) return false;

  const origin = req.headers.get("origin");
  const expectedHost = getRequestHost(req);

  if (origin) {
    try {
      const originHost = new URL(origin).host.toLowerCase();
      if (expectedHost && originHost !== expectedHost) {
        return true;
      }
    } catch {
      return true;
    }
  } else {
    const secFetchSite = req.headers.get("sec-fetch-site")?.toLowerCase();
    if (secFetchSite === "cross-site") {
      return true;
    }
  }

  return false;
}

function buildRedirectUrl(req: NextRequest, targetPath: string): URL {
  const forwardedHost = getRequestHost(req);

  const rawProto =
    req.headers.get("x-forwarded-proto") ||
    req.nextUrl.protocol.replace(":", "") ||
    "http";
  let forwardedProto = rawProto.split(",")[0]?.trim().toLowerCase() || "http";

  const origin = req.headers.get("origin") || "";
  const referer = req.headers.get("referer") || "";
  const isLocalHost =
    forwardedHost.startsWith("localhost") ||
    forwardedHost.startsWith("127.0.0.1");

  if (
    forwardedHost.endsWith(".run.app") ||
    forwardedHost.endsWith(".space-z.ai") ||
    forwardedHost.endsWith(".google.com") ||
    origin.startsWith("https://") ||
    referer.startsWith("https://") ||
    (!isLocalHost && process.env.NODE_ENV === "production")
  ) {
    forwardedProto = "https";
  }

  if (forwardedHost) {
    return new URL(targetPath, `${forwardedProto}://${forwardedHost}`);
  }
  return new URL(targetPath, req.url);
}

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // محافظت CSRF برای تمام APIهای تغییردهنده وضعیت
  if (path.startsWith("/api/") && isCrossOriginApiMutation(req)) {
    return NextResponse.json(
      { error: "Cross-origin state-changing request blocked (CSRF protection)" },
      { status: 403 },
    );
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const isDashboard = path.startsWith("/dashboard");
  const isPanel = path.startsWith("/panel");
  const hasValidShape = hasValidCookieShape(token);

  if (token && !hasValidShape) {
    if (isDashboard || isPanel) {
      const next = isDashboard ? path : "/panel/";
      const res = NextResponse.redirect(
        buildRedirectUrl(req, `/login/?next=${encodeURIComponent(next)}`),
      );
      res.cookies.delete(COOKIE_NAME);
      return res;
    }
    const res = NextResponse.next();
    res.cookies.delete(COOKIE_NAME);
    return res;
  }

  if (!hasValidShape && (isDashboard || isPanel)) {
    const next = isDashboard ? path : "/panel/";
    return NextResponse.redirect(
      buildRedirectUrl(req, `/login/?next=${encodeURIComponent(next)}`),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
    "/panel/:path*",
    "/login",
    "/login/",
  ],
};
