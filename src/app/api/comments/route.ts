import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { apiMsg } from "@/lib/i18n";
import { checkSlidingRateLimit, extractClientIp } from "@/lib/security";

/** POST /api/comments — نظر بازدیدکننده روی مقاله */
export async function POST(req: NextRequest) {
  try {
    const ip = extractClientIp(req.headers);
    const rl = checkSlidingRateLimit("comments-ip", ip, 10, 10 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: await apiMsg("تعداد ارسال نظر بیش از حد مجاز است.", "Too many comments submitted. Please wait a few minutes.") },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const body = (await req.json()) as {
      postId?: string;
      slug?: string;
      name?: string;
      email?: string;
      content?: string;
      parentId?: string;
    };

    const content = (body.content ?? "").trim().slice(0, 2000);
    const name = (body.name ?? "").trim().slice(0, 120);

    if (name.length < 3) {
      return NextResponse.json({ error: await apiMsg("نام را کامل وارد کنید", "Please enter your full name") }, { status: 400 });
    }
    if (content.length < 5) {
      return NextResponse.json({ error: await apiMsg("متن نظر کوتاه است", "Comment text is too short") }, { status: 400 });
    }

    let post;
    if (body.postId) {
      post = await db.post.findUnique({ where: { id: body.postId } });
    } else if (body.slug) {
      post = await db.post.findUnique({ where: { slug: body.slug } });
    }
    if (!post || post.status !== "PUBLISHED") {
      return NextResponse.json({ error: await apiMsg("مقاله یافت نشد", "Post not found") }, { status: 404 });
    }

    let validParentId: string | null = null;
    if (body.parentId) {
      const parent = await db.comment.findFirst({
        where: { id: body.parentId, postId: post.id, status: "APPROVED" },
        select: { id: true },
      });
      if (!parent) {
        return NextResponse.json({ error: await apiMsg("نظر والد معتبر نیست", "Invalid parent comment") }, { status: 400 });
      }
      validParentId = parent.id;
    }

    const user = await getCurrentUser();

    const comment = await db.comment.create({
      data: {
        postId: post.id,
        name,
        email: body.email?.trim().slice(0, 180) || null,
        content,
        status: "PENDING",
        authorId: user?.id ?? null,
        parentId: validParentId,
      },
      select: {
        id: true,
        postId: true,
        name: true,
        content: true,
        status: true,
        parentId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, comment });
  } catch (e) {
    console.error("comment error", e);
    return NextResponse.json({ error: await apiMsg("خطا در ثبت نظر", "Failed to submit the comment") }, { status: 500 });
  }
}
