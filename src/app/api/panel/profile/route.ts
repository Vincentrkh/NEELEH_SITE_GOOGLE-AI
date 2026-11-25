import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { apiMsg } from "@/lib/i18n";
import { hasAtLeastOneSocial, normalizeSocialsInput } from "@/lib/socials";

/**
 * GET /api/panel/profile — پروفایل کاربر فعلی
 * PUT /api/panel/profile — به‌روزرسانی پروفایل (نام، ایمیل، رشته، سوابق، بیو، شبکه‌های اجتماعی)
 */

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: await apiMsg("لاگین نیستید", "You are not signed in") }, { status: 401 });

  const fullUser = await db.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      field: true,
      education: true,
      bio: true,
      telegram: true,
      whatsapp: true,
      eitaa: true,
      bale: true,
      instagram: true,
      linkedin: true,
    },
  });

  return NextResponse.json({ user: fullUser ?? user });
}

type UpdateBody = {
  name?: string;
  email?: string | null;
  field?: string | null;
  education?: string | null;
  bio?: string | null;
  telegram?: string | null;
  whatsapp?: string | null;
  eitaa?: string | null;
  bale?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
};

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: await apiMsg("لاگین نیستید", "You are not signed in") }, { status: 401 });

  try {
    const body = (await req.json()) as UpdateBody;
    const currentDbUser = await db.user.findUnique({
      where: { id: user.id },
      select: {
        telegram: true,
        whatsapp: true,
        eitaa: true,
        bale: true,
        instagram: true,
        linkedin: true,
        registrations: { where: { status: { not: "CANCELLED" } }, select: { id: true }, take: 1 },
      },
    });

    const data: Record<string, string | null> = {};
    if (body.name !== undefined) {
      if (body.name.trim().length < 3) {
        return NextResponse.json({ error: await apiMsg("نام کوتاه است", "Name is too short") }, { status: 400 });
      }
      data.name = body.name.trim();
    }
    if (body.email !== undefined) data.email = (body.email ?? "").trim() || null;
    if (body.field !== undefined) data.field = (body.field ?? "").trim() || null;
    if (body.education !== undefined) data.education = (body.education ?? "").trim() || null;
    if (body.bio !== undefined) data.bio = (body.bio ?? "").trim().slice(0, 1000) || null;

    const normalizedSocials = normalizeSocialsInput({
      telegram: body.telegram !== undefined ? body.telegram : currentDbUser?.telegram,
      whatsapp: body.whatsapp !== undefined ? body.whatsapp : currentDbUser?.whatsapp,
      eitaa: body.eitaa !== undefined ? body.eitaa : currentDbUser?.eitaa,
      bale: body.bale !== undefined ? body.bale : currentDbUser?.bale,
      instagram: body.instagram !== undefined ? body.instagram : currentDbUser?.instagram,
      linkedin: body.linkedin !== undefined ? body.linkedin : currentDbUser?.linkedin,
    });

    const touchedSocial =
      body.telegram !== undefined ||
      body.whatsapp !== undefined ||
      body.eitaa !== undefined ||
      body.bale !== undefined ||
      body.instagram !== undefined ||
      body.linkedin !== undefined;

    if (touchedSocial) {
      if ((currentDbUser?.registrations.length ?? 0) > 0 && !hasAtLeastOneSocial(normalizedSocials)) {
        return NextResponse.json(
          {
            error: await apiMsg(
              "داشتن حداقل یک شبکه اجتماعی یا پیام‌رسان برای هنرجویان الزامی است.",
              "At least one social network or messenger handle is required."
            ),
          },
          { status: 400 }
        );
      }
      data.telegram = normalizedSocials.telegram;
      data.whatsapp = normalizedSocials.whatsapp;
      data.eitaa = normalizedSocials.eitaa;
      data.bale = normalizedSocials.bale;
      data.instagram = normalizedSocials.instagram;
      data.linkedin = normalizedSocials.linkedin;
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        field: true,
        education: true,
        bio: true,
        telegram: true,
        whatsapp: true,
        eitaa: true,
        bale: true,
        instagram: true,
        linkedin: true,
      },
    });

    return NextResponse.json({ user: updated });
  } catch (e) {
    console.error("profile update error", e);
    return NextResponse.json({ error: await apiMsg("خطا در به‌روزرسانی", "Update failed") }, { status: 500 });
  }
}
