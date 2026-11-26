import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, getRuntimeSecret } from "@/lib/auth";
import { getApiLang } from "@/lib/i18n";
import { syncAndGetRegistrationGantt } from "@/lib/attendance-sync";
import { ensureDefaultCourseExams } from "@/lib/exam-seed";
import {
  buildCertificateCode,
  computeCertificateVerificationHash,
  evaluateExamEligibility,
  gradeExamSubmission,
  sanitizeExamQuestionsForStudent,
} from "@/lib/exam-rules";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ registrationId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const lang = await getApiLang();
  const { registrationId } = await context.params;

  await ensureDefaultCourseExams();

  const reg = await db.registration.findFirst({
    where: { id: registrationId, studentId: user.id },
    include: {
      course: {
        include: {
          exam: {
            include: { questions: { orderBy: { order: "asc" } } },
          },
        },
      },
      examAttempts: { orderBy: { submittedAt: "desc" } },
      certificate: true,
    },
  });

  if (!reg) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  const gantt = await syncAndGetRegistrationGantt(reg.id, lang);
  const progressPercent = gantt?.stats.progressPercent ?? 0;
  const exam = reg.course.exam;

  if (!exam) {
    return NextResponse.json({
      registrationId: reg.id,
      courseTitle: reg.course.title,
      courseTitleEn: reg.course.titleEn,
      courseSlug: reg.course.slug,
      exam: null,
      eligibility: { eligible: false, reason: "EXAM_UNPUBLISHED" },
      progressPercent,
      attempts: [],
      certificate: null,
      questions: [],
    });
  }

  const eligibility = evaluateExamEligibility({
    registrationStatus: reg.status,
    isPublished: exam.isPublished,
    questionCount: exam.questions.length,
    progressPercent,
    minProgressPercent: exam.minProgressPercent,
    requireCourseCompletion: exam.requireCourseCompletion,
    examUnlocked: reg.examUnlocked,
    attemptsUsed: reg.examAttempts.length,
    maxAttempts: exam.maxAttempts,
    hasCertificate: Boolean(reg.certificate && !reg.certificate.revokedAt),
  });

  return NextResponse.json({
    registrationId: reg.id,
    courseTitle: reg.course.title,
    courseTitleEn: reg.course.titleEn,
    courseSlug: reg.course.slug,
    examUnlocked: reg.examUnlocked,
    progressPercent,
    exam: {
      id: exam.id,
      title: exam.title,
      titleEn: exam.titleEn,
      description: exam.description,
      descriptionEn: exam.descriptionEn,
      passingScore: exam.passingScore,
      durationMins: exam.durationMins,
      maxAttempts: exam.maxAttempts,
      minProgressPercent: exam.minProgressPercent,
      requireCourseCompletion: exam.requireCourseCompletion,
      questionCount: exam.questions.length,
    },
    eligibility,
    questions: eligibility.eligible ? sanitizeExamQuestionsForStudent(exam.questions) : [],
    attempts: reg.examAttempts.map((a) => ({
      id: a.id,
      attemptNumber: a.attemptNumber,
      scorePercent: a.scorePercent,
      earnedPoints: a.earnedPoints,
      totalPoints: a.totalPoints,
      passed: a.passed,
      submittedAt: a.submittedAt.toISOString(),
    })),
    certificate:
      reg.certificate && !reg.certificate.revokedAt
        ? {
            certificateCode: reg.certificate.certificateCode,
            scorePercent: reg.certificate.scorePercent,
            issuedAt: reg.certificate.issuedAt.toISOString(),
          }
        : null,
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ registrationId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const lang = await getApiLang();
  const { registrationId } = await context.params;

  const body = (await req.json().catch(() => ({}))) as {
    answers?: Record<string, string>;
    startedAt?: string;
  };

  await ensureDefaultCourseExams();

  const reg = await db.registration.findFirst({
    where: { id: registrationId, studentId: user.id },
    include: {
      course: {
        include: {
          exam: { include: { questions: { orderBy: { order: "asc" } } } },
        },
      },
      examAttempts: { orderBy: { submittedAt: "desc" } },
      certificate: true,
    },
  });

  if (!reg || !reg.course.exam) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }

  const gantt = await syncAndGetRegistrationGantt(reg.id, lang);
  const progressPercent = gantt?.stats.progressPercent ?? 0;
  const exam = reg.course.exam;

  const eligibility = evaluateExamEligibility({
    registrationStatus: reg.status,
    isPublished: exam.isPublished,
    questionCount: exam.questions.length,
    progressPercent,
    minProgressPercent: exam.minProgressPercent,
    requireCourseCompletion: exam.requireCourseCompletion,
    examUnlocked: reg.examUnlocked,
    attemptsUsed: reg.examAttempts.length,
    maxAttempts: exam.maxAttempts,
    hasCertificate: Boolean(reg.certificate && !reg.certificate.revokedAt),
  });

  if (!eligibility.eligible) {
    return NextResponse.json(
      {
        error:
          lang === "fa"
            ? "شرایط شرکت در این آزمون فعال نیست."
            : "You are not currently eligible to submit this exam.",
        reason: eligibility.reason,
      },
      { status: 403 },
    );
  }

  const submittedAnswers =
    body.answers && typeof body.answers === "object" ? body.answers : {};

  const graded = gradeExamSubmission({
    questions: exam.questions,
    submittedAnswers,
    passingScore: exam.passingScore,
  });

  const startedAtDate = body.startedAt ? new Date(body.startedAt) : new Date();
  const safeStartedAt = Number.isNaN(startedAtDate.getTime()) ? new Date() : startedAtDate;

  const attemptNumber = reg.examAttempts.length + 1;
  const secret = getRuntimeSecret();

  const outcome = await db.$transaction(async (tx) => {
    const attempt = await tx.examAttempt.create({
      data: {
        examId: exam.id,
        registrationId: reg.id,
        studentId: user.id,
        attemptNumber,
        answersJson: JSON.stringify(submittedAnswers),
        scorePercent: graded.scorePercent,
        earnedPoints: graded.earnedPoints,
        totalPoints: graded.totalPoints,
        passed: graded.passed,
        startedAt: safeStartedAt,
        submittedAt: new Date(),
      },
    });

    let certificate = reg.certificate;
    if (graded.passed && (!certificate || certificate.revokedAt)) {
      const certCode = buildCertificateCode(reg.course.slug);
      const vHash = computeCertificateVerificationHash(
        {
          certificateCode: certCode,
          studentId: user.id,
          courseId: reg.courseId,
          scorePercent: graded.scorePercent,
        },
        secret,
      );

      if (certificate) {
        certificate = await tx.courseCertificate.update({
          where: { id: certificate.id },
          data: {
            certificateCode: certCode,
            attemptId: attempt.id,
            studentName: user.name,
            studentNameEn: user.nameEn,
            courseTitle: reg.course.title,
            courseTitleEn: reg.course.titleEn,
            scorePercent: graded.scorePercent,
            durationHrs: reg.course.durationHrs,
            verificationHash: vHash,
            issuedAt: new Date(),
            revokedAt: null,
          },
        });
      } else {
        certificate = await tx.courseCertificate.create({
          data: {
            certificateCode: certCode,
            registrationId: reg.id,
            studentId: user.id,
            courseId: reg.courseId,
            examId: exam.id,
            attemptId: attempt.id,
            studentName: user.name,
            studentNameEn: user.nameEn,
            courseTitle: reg.course.title,
            courseTitleEn: reg.course.titleEn,
            scorePercent: graded.scorePercent,
            durationHrs: reg.course.durationHrs,
            verificationHash: vHash,
          },
        });
      }

      // Send congratulatory cartable message
      const msg = await tx.studentMessage.create({
        data: {
          title: `صدور گواهینامه پایان دوره: ${reg.course.title}`,
          body: `تبریک ${user.name} عزیز! شما آزمون پایان دوره «${reg.course.title}» را با نمره ${graded.scorePercent}٪ با موفقیت گذراندید. کد گواهینامه شما: ${certificate.certificateCode}`,
          channels: "CARTABLE",
          isBroadcast: false,
          courseId: reg.courseId,
        },
      });
      await tx.studentMessageRecipient.create({
        data: {
          messageId: msg.id,
          studentId: user.id,
          registrationId: reg.id,
        },
      });
    }

    return { attempt, certificate };
  });

  return NextResponse.json({
    ok: true,
    attemptId: outcome.attempt.id,
    attemptNumber,
    scorePercent: graded.scorePercent,
    earnedPoints: graded.earnedPoints,
    totalPoints: graded.totalPoints,
    passed: graded.passed,
    passingScore: exam.passingScore,
    breakdown: graded.breakdown,
    certificate:
      outcome.certificate && !outcome.certificate.revokedAt
        ? {
            certificateCode: outcome.certificate.certificateCode,
            scorePercent: outcome.certificate.scorePercent,
            issuedAt: outcome.certificate.issuedAt.toISOString(),
          }
        : null,
  });
}
