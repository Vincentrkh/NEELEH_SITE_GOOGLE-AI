import { cache } from "react";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { cookies, headers } from "next/headers";
import { db } from "./db";
import { PERMISSIONS, hasPermission as checkHasPermission } from "./permissions";

/**
 * احراز هویت سبک بدون وابستگی خارجی:
 * - رمزها با scrypt هش می‌شوند (salt تصادفی).
 * - نشست = رکورد در جدول Session با توکن تصادفی و امضای HMAC؛ کوکی httpOnly حاوی توکن.
 * - توکن منقضی شونده (۳۰ روز).
 */

const COOKIE_NAME = "neeleh_session";
const SESSION_TTL_MS = 60 * 60 * 24 * 30 * 1000; // ۳۰ روز

const globalAuthSecret = globalThis as unknown as {
  __neelehSessionSecret?: string;
};

/**
 * کلید امضای نشست:
 * - در صورت تنظیم SESSION_SECRET در env از آن استفاده می‌کند.
 * - در غیر این صورت، یک کلید ۲۵۶ بیتی تصادفی در db/.session_secret با دسترسی 0600 تولید و کش می‌کند
 *   تا هیچ کلید هاردکدشده و قابل پیش‌بینی در کد وجود نداشته باشد.
 */
export function getRuntimeSecret(): string {
  const envSecret = process.env.SESSION_SECRET?.trim();
  if (envSecret && envSecret.length >= 16) {
    return envSecret;
  }
  if (globalAuthSecret.__neelehSessionSecret) {
    return globalAuthSecret.__neelehSessionSecret;
  }
  const secretFile = path.join(process.cwd(), "db", ".session_secret");
  try {
    if (existsSync(secretFile)) {
      const stored = readFileSync(secretFile, "utf8").trim();
      if (stored.length >= 32) {
        globalAuthSecret.__neelehSessionSecret = stored;
        return stored;
      }
    }
    mkdirSync(path.dirname(secretFile), { recursive: true });
    const generated = randomBytes(32).toString("hex");
    writeFileSync(secretFile, generated, { mode: 0o600 });
    globalAuthSecret.__neelehSessionSecret = generated;
    return generated;
  } catch {
    const ephemeral = randomBytes(32).toString("hex");
    globalAuthSecret.__neelehSessionSecret = ephemeral;
    return ephemeral;
  }
}

// ── رمز عبور ──

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!password || password.length > 256) return false;
  const parts = String(stored ?? "").split(":");
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  if (!salt || !hash || !/^[0-9a-f]+$/i.test(hash)) return false;
  try {
    const candidate = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    return (
      candidate.length === expected.length && timingSafeEqual(candidate, expected)
    );
  } catch {
    return false;
  }
}

// ── نشست ──

function sign(payload: string): string {
  return createHmac("sha256", getRuntimeSecret()).update(payload).digest("base64url");
}

export function createSessionToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      uid: userId,
      iat: Date.now(),
      jti: randomBytes(16).toString("hex"),
    }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function parseSessionToken(token: string): { uid: string; iat: number } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (
    sig.length !== expected.length ||
    !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      uid?: string;
      iat?: number;
    };
    if (!data.uid || !data.iat) return null;
    if (Date.now() - data.iat > SESSION_TTL_MS) return null;
    return { uid: data.uid, iat: data.iat };
  } catch {
    return null;
  }
}

// ── کوکی ──

async function detectHttpsRequest(): Promise<boolean> {
  const h = await headers();
  return (
    h.get("x-forwarded-proto") === "https" ||
    (h.get("origin") ?? "").startsWith("https://") ||
    (h.get("referer") ?? "").startsWith("https://") ||
    (h.get("x-forwarded-host") ?? "").endsWith(".run.app") ||
    (h.get("host") ?? "").endsWith(".run.app") ||
    process.env.NODE_ENV === "production"
  );
}

export async function setSessionCookie(userId: string) {
  const token = createSessionToken(userId);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  // ذخیره رکورد نشست در دیتابیس برای ابطال‌پذیری
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 64) || null;
  const userAgent = h.get("user-agent")?.slice(0, 256) || null;

  await db.session.create({
    data: { userId, token, expiresAt, ip, userAgent },
  });

  const isHttps = await detectHttpsRequest();

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: isHttps ? "none" : "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
    secure: isHttps,
    ...(isHttps ? { partitioned: true } : {}),
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token) {
    // ابطال در دیتابیس
    await db.session.deleteMany({ where: { token } }).catch(() => {});
  }
  const isHttps = await detectHttpsRequest();
  jar.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: isHttps ? "none" : "lax",
    path: "/",
    maxAge: 0,
    secure: isHttps,
    ...(isHttps ? { partitioned: true } : {}),
  });
}

// ── کاربر جاری ──

export type SessionUser = {
  id: string;
  name: string;
  nameEn: string | null;
  phone: string;
  email: string | null;
  avatarUrl: string | null;
  field: string | null;
  education: string | null;
  bio: string | null;
  bioEn: string | null;
  roles: string[]; // نام نقش‌ها (مثلاً ["ADMIN"])
  permissions: string[]; // لیست کلیدهای مجوز
};

export type PortalRole = "anon" | "student" | "staff";

export function getPortalRole(user: SessionUser | null | undefined): PortalRole {
  if (!user) return "anon";
  if (user.roles.includes("ADMIN") || user.roles.includes("EDITOR")) return "staff";
  return "student";
}

/** کاربر جاری از کوکی — null اگر لاگین نیست (Memoized per RSC request). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const parsed = parseSessionToken(token);
  if (!parsed) {
    return null;
  }

  // بررسی وجود رکورد نشست در دیتابیس و تطابق مالک نشست
  const session = await db.session.findUnique({
    where: { token },
    select: { id: true, userId: true, expiresAt: true },
  });
  if (
    !session ||
    session.userId !== parsed.uid ||
    session.expiresAt.getTime() < Date.now()
  ) {
    if (session) {
      await db.session.delete({ where: { id: session.id } }).catch(() => {});
    }
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: parsed.uid },
    select: {
      id: true,
      name: true,
      nameEn: true,
      phone: true,
      email: true,
      avatarUrl: true,
      field: true,
      education: true,
      bio: true,
      bioEn: true,
      userRoles: {
        select: {
          role: {
            select: {
              name: true,
              rolePermissions: {
                select: { permission: { select: { key: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!user) return null;

  const roles = user.userRoles.map((ur) => ur.role.name);
  const permissions = Array.from(
    new Set(
      user.userRoles.flatMap((ur) =>
        ur.role.rolePermissions.map((rp) => rp.permission.key),
      ),
    ),
  );

  return {
    id: user.id,
    name: user.name,
    nameEn: user.nameEn,
    phone: user.phone,
    email: user.email,
    avatarUrl: user.avatarUrl,
    field: user.field,
    education: user.education,
    bio: user.bio,
    bioEn: user.bioEn,
    roles,
    permissions,
  };
});

/** گارد مسیرهای ادمین — کاربر یا null. */
export async function requireUser(): Promise<SessionUser | null> {
  return await getCurrentUser();
}

/** گارد با چک دسترسی — کاربر یا null اگر دسترسی نداشت. */
export async function requirePermission(
  permission: string,
): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.roles.includes("ADMIN")) return user; // ادمین همیشه دسترسی دارد
  return checkHasPermission(user.permissions, permission) ? user : null;
}

/** گارد فقط ادمین. */
export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  return user && user.roles.includes("ADMIN") ? user : null;
}

export { PERMISSIONS };
