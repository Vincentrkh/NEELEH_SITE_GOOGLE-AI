import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizePhone, isValidPhone } from "@/lib/format";
import { apiMsg } from "@/lib/i18n";
import { generateTrackingCode } from "@/lib/domain/academy-rules";
import { emitDomainEvent } from "@/lib/events/dispatcher";
import { checkSlidingRateLimit, extractClientIp } from "@/lib/security";

type Body = {
  name?: string;
  phone?: string;
  email?: string;
  message?: string;
  topic?: string;
  preferredFormat?: string;
  source?: string;
};

/** POST /api/leads — فرم مشاوره رایگان و درخواست تماس (عمومی) */
export async function POST(req: NextRequest) {
  try {
    const ip = extractClientIp(req.headers);
    const rl = checkSlidingRateLimit("leads-ip", ip, 10, 10 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: await apiMsg("تعداد درخواست‌ها بیش از حد مجاز است. دقایقی بعد تلاش کنید.", "Too many requests. Please try again later.") },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const body = (await req.json()) as Body;
    const name = (body.name ?? "").trim();
    const phone = normalizePhone(body.phone ?? "");
    const email = (body.email ?? "").trim() || null;
    const topic = (body.topic ?? "").trim().slice(0, 120);
    const preferredFormat = (body.preferredFormat ?? "").trim().slice(0, 60);
    const rawMsg = (body.message ?? "").trim().slice(0, 2000);
    const source = (body.source ?? "consult").trim().slice(0, 40);

    if (name.length < 3) {
      return NextResponse.json(
        { error: await apiMsg("نام را کامل وارد کنید", "Please enter your full name") },
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

    const requestId = generateTrackingCode("REQ", topic || source);
    const contextHeader = [
      topic ? `موضوع: ${topic}` : null,
      preferredFormat ? `نحوه برگزاری: ${preferredFormat}` : null,
      `کد پیگیری: ${requestId}`,
    ]
      .filter(Boolean)
      .join(" | ");

    const composedMessage = rawMsg
      ? `${contextHeader}\n${rawMsg}`
      : contextHeader;

    const lead = await db.lead.create({
      data: { name, phone, email, message: composedMessage },
    });

    await emitDomainEvent({
      name: "lead.created",
      entityType: "Lead",
      entityId: lead.id,
      payload: {
        requestId,
        name,
        phone,
        topic,
        preferredFormat,
        message: rawMsg,
        source,
      },
    }).catch((err) => console.error("lead domain event error", err));

    return NextResponse.json({ ok: true, id: lead.id, requestId });
  } catch (e) {
    console.error("lead create error", e);
    return NextResponse.json(
      { error: await apiMsg("خطا در ثبت درخواست", "Failed to submit the request") },
      { status: 500 }
    );
  }
}
