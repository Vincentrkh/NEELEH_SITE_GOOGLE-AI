import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { apiMsg } from "@/lib/i18n";
import { ensureDefaultCourseExams } from "@/lib/exam-seed";
import { parseExamOptions } from "@/lib/exam-rules";
import { executeSectionAI } from "@/lib/ai/connections";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requirePermission("course.update");
  if (!user) {
    return NextResponse.json(
      { error: await apiMsg("دسترسی مجاز نیست", "Not authorized") },
      { status: 403 },
    );
  }

  await ensureDefaultCourseExams();

  const [courses, certificates] = await Promise.all([
    db.course.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        titleEn: true,
        tier: true,
        published: true,
        durationHrs: true,
        exam: {
          include: {
            questions: { orderBy: { order: "asc" } },
            _count: { select: { attempts: true, certificates: true } },
          },
        },
      },
    }),
    db.courseCertificate.findMany({
      orderBy: { issuedAt: "desc" },
      take: 60,
      include: {
        student: { select: { phone: true, email: true } },
        course: { select: { slug: true } },
      },
    }),
  ]);

  return NextResponse.json({
    courses: courses.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      titleEn: c.titleEn,
      tier: c.tier,
      published: c.published,
      durationHrs: c.durationHrs,
      exam: c.exam
        ? {
            id: c.exam.id,
            courseId: c.exam.courseId,
            title: c.exam.title,
            titleEn: c.exam.titleEn,
            description: c.exam.description,
            descriptionEn: c.exam.descriptionEn,
            passingScore: c.exam.passingScore,
            durationMins: c.exam.durationMins,
            maxAttempts: c.exam.maxAttempts,
            requireCourseCompletion: c.exam.requireCourseCompletion,
            minProgressPercent: c.exam.minProgressPercent,
            isPublished: c.exam.isPublished,
            attemptsCount: c.exam._count.attempts,
            certificatesCount: c.exam._count.certificates,
            questions: c.exam.questions.map((q) => ({
              id: q.id,
              order: q.order,
              prompt: q.prompt,
              promptEn: q.promptEn,
              options: parseExamOptions(q.optionsJson),
              correctOptionId: q.correctOptionId,
              explanation: q.explanation,
              explanationEn: q.explanationEn,
              points: q.points,
            })),
          }
        : null,
    })),
    certificates: certificates.map((cert) => ({
      id: cert.id,
      certificateCode: cert.certificateCode,
      studentName: cert.studentName,
      studentNameEn: cert.studentNameEn,
      studentPhone: cert.student.phone,
      courseTitle: cert.courseTitle,
      courseTitleEn: cert.courseTitleEn,
      courseSlug: cert.course.slug,
      scorePercent: cert.scorePercent,
      durationHrs: cert.durationHrs,
      issuedAt: cert.issuedAt.toISOString(),
      revokedAt: cert.revokedAt ? cert.revokedAt.toISOString() : null,
    })),
  });
}

export async function PUT(req: NextRequest) {
  const user = await requirePermission("course.update");
  if (!user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    courseId?: string;
    title?: string;
    titleEn?: string;
    description?: string;
    descriptionEn?: string;
    passingScore?: number;
    durationMins?: number;
    maxAttempts?: number;
    requireCourseCompletion?: boolean;
    minProgressPercent?: number;
    isPublished?: boolean;
  };

  if (!body.courseId || !(body.title ?? "").trim()) {
    return NextResponse.json({ error: "courseId and title are required" }, { status: 400 });
  }

  const passingScore = Math.max(40, Math.min(100, Math.floor(Number(body.passingScore) || 70)));
  const durationMins = Math.max(5, Math.min(180, Math.floor(Number(body.durationMins) || 20)));
  const maxAttempts = Math.max(1, Math.min(20, Math.floor(Number(body.maxAttempts) || 3)));
  const minProgressPercent = Math.max(
    0,
    Math.min(100, Math.floor(Number(body.minProgressPercent) ?? 70)),
  );

  const exam = await db.courseExam.upsert({
    where: { courseId: body.courseId },
    create: {
      courseId: body.courseId,
      title: body.title!.trim(),
      titleEn: (body.titleEn ?? "").trim() || null,
      description: (body.description ?? "").trim(),
      descriptionEn: (body.descriptionEn ?? "").trim(),
      passingScore,
      durationMins,
      maxAttempts,
      requireCourseCompletion: body.requireCourseCompletion ?? true,
      minProgressPercent,
      isPublished: body.isPublished ?? true,
    },
    update: {
      title: body.title!.trim(),
      titleEn: (body.titleEn ?? "").trim() || null,
      description: (body.description ?? "").trim(),
      descriptionEn: (body.descriptionEn ?? "").trim(),
      passingScore,
      durationMins,
      maxAttempts,
      requireCourseCompletion: body.requireCourseCompletion ?? true,
      minProgressPercent,
      isPublished: body.isPublished ?? true,
    },
  });

  return NextResponse.json({ ok: true, exam });
}

export async function POST(req: NextRequest) {
  const user = await requirePermission("course.update");
  if (!user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: "save-question" | "delete-question" | "generate-ai";
    examId?: string;
    courseId?: string;
    questionId?: string;
    prompt?: string;
    promptEn?: string;
    options?: Array<{ id: string; text: string; textEn?: string }>;
    correctOptionId?: string;
    explanation?: string;
    explanationEn?: string;
    points?: number;
  };

  if (body.action === "delete-question" && body.questionId) {
    await db.examQuestion.delete({ where: { id: body.questionId } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "generate-ai" && body.courseId) {
    const course = await db.course.findUnique({
      where: { id: body.courseId },
      include: { sections: { orderBy: { order: "asc" } }, exam: true },
    });
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    const aiRes = await executeSectionAI({
      sectionKey: "exam_generator",
      lang: "fa",
      actorId: user.id,
      responseMimeType: "application/json",
      prompt: `Generate ONE practical multiple-choice exam question (4 options: a, b, c, d) in Persian and English for the course "${course.title}" (${course.titleEn || course.title}).
Course topics: ${course.sections.map((s) => `${s.title}: ${s.items}`).join(" | ").slice(0, 1200)}
Return STRICT JSON:
{
  "prompt": "Persian question",
  "promptEn": "English question",
  "options": [
    {"id":"a","text":"...","textEn":"..."},
    {"id":"b","text":"...","textEn":"..."},
    {"id":"c","text":"...","textEn":"..."},
    {"id":"d","text":"...","textEn":"..."}
  ],
  "correctOptionId": "a",
  "explanation": "Persian explanation",
  "explanationEn": "English explanation"
}`,
    });
    if (!aiRes.ok) {
      return NextResponse.json({ error: aiRes.error }, { status: aiRes.status });
    }
    try {
      const cleaned = aiRes.text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      const draft = JSON.parse(cleaned) as Record<string, unknown>;
      return NextResponse.json({ ok: true, draft });
    } catch {
      return NextResponse.json(
        { error: "AI response could not be parsed as question JSON" },
        { status: 502 },
      );
    }
  }

  if (!body.examId || !(body.prompt ?? "").trim()) {
    return NextResponse.json({ error: "examId and question prompt are required" }, { status: 400 });
  }

  const options = Array.isArray(body.options)
    ? body.options
        .map((o, idx) => ({
          id: (o.id || String.fromCharCode(97 + idx)).trim(),
          text: String(o.text ?? "").trim(),
          ...(o.textEn ? { textEn: String(o.textEn).trim() } : {}),
        }))
        .filter((o) => o.text.length > 0)
    : [];

  if (options.length < 2) {
    return NextResponse.json({ error: "At least 2 non-empty options are required" }, { status: 400 });
  }

  const correctOptionId = options.some((o) => o.id === body.correctOptionId)
    ? String(body.correctOptionId)
    : options[0].id;
  const points = Math.max(1, Math.min(20, Math.floor(Number(body.points) || 1)));

  if (body.questionId) {
    await db.examQuestion.update({
      where: { id: body.questionId },
      data: {
        prompt: body.prompt!.trim(),
        promptEn: (body.promptEn ?? "").trim() || null,
        optionsJson: JSON.stringify(options),
        correctOptionId,
        explanation: (body.explanation ?? "").trim(),
        explanationEn: (body.explanationEn ?? "").trim(),
        points,
      },
    });
  } else {
    const count = await db.examQuestion.count({ where: { examId: body.examId } });
    await db.examQuestion.create({
      data: {
        examId: body.examId,
        order: count + 1,
        prompt: body.prompt!.trim(),
        promptEn: (body.promptEn ?? "").trim() || null,
        optionsJson: JSON.stringify(options),
        correctOptionId,
        explanation: (body.explanation ?? "").trim(),
        explanationEn: (body.explanationEn ?? "").trim(),
        points,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
