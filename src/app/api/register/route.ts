import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hashPassword, setSessionCookie, verifyPassword } from "@/lib/auth";
import { isValidPhone, normalizePhone } from "@/lib/format";
import { apiMsg } from "@/lib/i18n";
import { generateTrackingCode, isRegistrationAllowed } from "@/lib/domain/academy-rules";
import { emitDomainEvent } from "@/lib/events/dispatcher";
import { checkSlidingRateLimit, extractClientIp } from "@/lib/security";
import { hasAtLeastOneSocial, normalizeSocialsInput } from "@/lib/socials";

type Body = {
  slug?: string;
  sessionId?: string;
  name?: string;
  phone?: string;
  password?: string;
  email?: string;
  field?: string;
  education?: string;
  note?: string;
  telegram?: string;
  whatsapp?: string;
  eitaa?: string;
  bale?: string;
  instagram?: string;
  linkedin?: string;
};

/**
 * POST /api/register
 * ساخت حساب کاربری + ثبت‌نام اتمی در دوره (با تراکنش دیتابیس و الزام ثبت حداقل یک شبکه اجتماعی).
 */
export async function POST(req: NextRequest) {
  try {
    const ip = extractClientIp(req.headers);
    const rl = checkSlidingRateLimit("register-ip", ip, 10, 10 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: await apiMsg("تعداد درخواست‌ها بیش از حد مجاز است. دقایقی بعد تلاش کنید.", "Too many requests. Please try again later.") },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const sessionUser = await getCurrentUser();
    const body = (await req.json()) as Body;
    const name = (body.name ?? sessionUser?.name ?? "").trim();
    const phone = sessionUser ? sessionUser.phone : normalizePhone(body.phone ?? "");
    const password = String(body.password ?? "");
    const note = (body.note ?? "").trim().slice(0, 1000);
    const requestedSessionId = (body.sessionId ?? "").trim() || null;

    const incomingSocials = normalizeSocialsInput({
      telegram: body.telegram,
      whatsapp: body.whatsapp,
      eitaa: body.eitaa,
      bale: body.bale,
      instagram: body.instagram,
      linkedin: body.linkedin,
    });

    if (name.length < 3) {
      return NextResponse.json(
        { error: await apiMsg("نام و نام خانوادگی را کامل وارد کنید", "Please enter your full name") },
        { status: 400 }
      );
    }
    if (!isValidPhone(phone)) {
      return NextResponse.json(
        {
          error: await apiMsg(
            "شماره موبایل معتبر نیست (مثال: ۰۹۱۲۱۲۳۴۵۶۷)",
            "Invalid mobile number (e.g. 09121234567)"
          ),
        },
        { status: 400 }
      );
    }
    if (!sessionUser && (password.length < 6 || password.length > 128)) {
      return NextResponse.json(
        { error: await apiMsg("رمز عبور باید بین ۶ تا ۱۲۸ کاراکتر باشد", "Password must be 6–128 characters") },
        { status: 400 }
      );
    }

    const course = await db.course.findUnique({
      where: { slug: body.slug ?? "" },
    });
    if (!course) {
      return NextResponse.json(
        { error: await apiMsg("دوره موردنظر یافت نشد", "Course not found") },
        { status: 404 }
      );
    }

    let chosenSession: {
      id: string;
      capacity: number | null;
      priceAmount: number | null;
      status: string;
      registrationDeadline: Date | null;
      startAt: Date | null;
      date: Date | null;
    } | null = null;
    if (requestedSessionId) {
      const s = await db.courseSession.findFirst({
        where: { id: requestedSessionId, courseId: course.id },
        select: {
          id: true,
          capacity: true,
          priceAmount: true,
          status: true,
          registrationDeadline: true,
          startAt: true,
          date: true,
        },
      });
      if (!s) {
        return NextResponse.json(
          { error: await apiMsg("نوبت انتخاب‌شده برای این دوره معتبر نیست", "Selected cohort session is not valid for this course") },
          { status: 400 }
        );
      }
      chosenSession = s;
    }

    // حساب کاربری: کاربر واردشده، حساب موجود، یا ایجاد حساب جدید
    let user = await db.user.findUnique({ where: { phone } });
    let isNewUser = false;

    if (user) {
      if (!sessionUser || sessionUser.id !== user.id) {
        const phoneRl = checkSlidingRateLimit("register-phone", phone, 6, 10 * 60 * 1000);
        if (!phoneRl.allowed) {
          return NextResponse.json(
            { error: await apiMsg("تعداد تلاش‌ها برای این شماره زیاد است.", "Too many attempts for this number.") },
            { status: 429, headers: { "Retry-After": String(phoneRl.retryAfterSec) } }
          );
        }
        if (!verifyPassword(password, user.password)) {
          return NextResponse.json(
            {
              error: await apiMsg(
                "این شماره قبلاً ثبت شده و رمز واردشده با رمز فعلی هم‌خوانی ندارد. از صفحه ورود استفاده کنید.",
                "This number is already registered and the entered password does not match it. Use the sign-in page instead."
              ),
            },
            { status: 409 }
          );
        }
      }

      const mergedSocials = {
        telegram: incomingSocials.telegram ?? user.telegram,
        whatsapp: incomingSocials.whatsapp ?? user.whatsapp,
        eitaa: incomingSocials.eitaa ?? user.eitaa,
        bale: incomingSocials.bale ?? user.bale,
        instagram: incomingSocials.instagram ?? user.instagram,
        linkedin: incomingSocials.linkedin ?? user.linkedin,
      };

      if (!hasAtLeastOneSocial(mergedSocials)) {
        return NextResponse.json(
          {
            error: await apiMsg(
              "ثبت حداقل یک شبکه اجتماعی یا پیام‌رسان (تلگرام، واتساپ، ایتا، بله، اینستاگرام یا لینکدین) الزامی است.",
              "Please enter at least one social network or messenger handle (Telegram, WhatsApp, Eitaa, Bale, Instagram, or LinkedIn)."
            ),
          },
          { status: 400 }
        );
      }

      user = await db.user.update({
        where: { id: user.id },
        data: {
          name: name || user.name,
          email: body.email?.trim() || user.email,
          field: body.field?.trim() || user.field,
          education: body.education?.trim() || user.education,
          telegram: mergedSocials.telegram,
          whatsapp: mergedSocials.whatsapp,
          eitaa: mergedSocials.eitaa,
          bale: mergedSocials.bale,
          instagram: mergedSocials.instagram,
          linkedin: mergedSocials.linkedin,
        },
      });
    } else {
      if (!hasAtLeastOneSocial(incomingSocials)) {
        return NextResponse.json(
          {
            error: await apiMsg(
              "ثبت حداقل یک شبکه اجتماعی یا پیام‌رسان (تلگرام، واتساپ، ایتا، بله، اینستاگرام یا لینکدین) الزامی است.",
              "Please enter at least one social network or messenger handle (Telegram, WhatsApp, Eitaa, Bale, Instagram, or LinkedIn)."
            ),
          },
          { status: 400 }
        );
      }

      const studentRole = await db.role.findUnique({ where: { name: "STUDENT" } });
      user = await db.user.create({
        data: {
          phone,
          name,
          password: hashPassword(password),
          email: body.email?.trim() || null,
          field: body.field?.trim() || null,
          education: body.education?.trim() || null,
          telegram: incomingSocials.telegram,
          whatsapp: incomingSocials.whatsapp,
          eitaa: incomingSocials.eitaa,
          bale: incomingSocials.bale,
          instagram: incomingSocials.instagram,
          linkedin: incomingSocials.linkedin,
          userRoles: studentRole ? { create: [{ roleId: studentRole.id }] } : undefined,
        },
      });
      isNewUser = true;
    }

    const trackingCode = generateTrackingCode("NL", course.slug);
    const priceSnapshot = chosenSession?.priceAmount ?? course.price;
    const effectiveCapacity = chosenSession?.capacity ?? course.capacity;
    const sessionStart = chosenSession?.startAt ?? chosenSession?.date ?? null;

    const txResult = await db.$transaction(async (tx) => {
      const activeTaken = await tx.registration.count({
        where: {
          courseId: course.id,
          ...(chosenSession ? { sessionId: chosenSession.id } : {}),
          status: { not: "CANCELLED" },
        },
      });

      const gate = isRegistrationAllowed({
        published: course.published,
        regStatus: course.regStatus,
        capacity: effectiveCapacity,
        activeTaken,
        sessionStatus: chosenSession?.status,
        registrationDeadline: chosenSession?.registrationDeadline,
      });

      if (!gate.allowed) {
        return { errorCode: gate.reason } as const;
      }

      const existing = await tx.registration.findUnique({
        where: {
          studentId_courseId: { studentId: user.id, courseId: course.id },
        },
      });

      if (existing && existing.status !== "CANCELLED") {
        return { errorCode: "DUPLICATE" } as const;
      }

      const registration = existing
        ? await tx.registration.update({
            where: { id: existing.id },
            data: {
              status: "PENDING",
              note,
              sessionId: chosenSession?.id ?? existing.sessionId,
              trackingCode: existing.trackingCode || trackingCode,
              priceSnapshot,
              scheduleStartDate: sessionStart ?? existing.scheduleStartDate,
            },
          })
        : await tx.registration.create({
            data: {
              studentId: user.id,
              courseId: course.id,
              sessionId: chosenSession?.id ?? null,
              trackingCode,
              priceSnapshot,
              note,
              scheduleStartDate: sessionStart,
            },
          });

      return { registration } as const;
    });

    if ("errorCode" in txResult) {
      if (txResult.errorCode === "DUPLICATE") {
        return NextResponse.json(
          { error: await apiMsg("شما قبلاً در این دوره ثبت‌نام کرده‌اید", "You have already registered for this course") },
          { status: 409 }
        );
      }
      if (txResult.errorCode === "FULL") {
        return NextResponse.json(
          { error: await apiMsg("ظرفیت این دوره تکمیل شده است", "This course is fully booked") },
          { status: 400 }
        );
      }
      if (txResult.errorCode === "DEADLINE_PASSED") {
        return NextResponse.json(
          { error: await apiMsg("مهلت ثبت‌نام این نوبت به پایان رسیده است", "The registration deadline for this cohort has passed") },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: await apiMsg("ظرفیت ثبت‌نام این دوره باز نیست", "Registration for this course is not open") },
        { status: 400 }
      );
    }

    await setSessionCookie(user.id);

    await emitDomainEvent({
      name: "enrollment.requested",
      entityType: "Registration",
      entityId: txResult.registration.id,
      actorId: user.id,
      payload: {
        studentName: user.name,
        courseSlug: course.slug,
        courseTitle: course.title,
        trackingCode: txResult.registration.trackingCode ?? trackingCode,
        priceSnapshot,
      },
    }).catch((err) => console.error("registration event error", err));

    return NextResponse.json({
      ok: true,
      registrationId: txResult.registration.id,
      trackingCode: txResult.registration.trackingCode ?? trackingCode,
      studentName: user.name,
      courseTitle: course.title,
      isNewUser,
    });
  } catch (e) {
    console.error("register error", e);
    return NextResponse.json(
      { error: await apiMsg("خطای غیرمنتظره در ثبت‌نام", "Unexpected error during registration") },
      { status: 500 }
    );
  }
}
