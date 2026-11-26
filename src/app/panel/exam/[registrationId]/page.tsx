import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getServerLang } from "@/lib/i18n";
import { syncAndGetRegistrationGantt } from "@/lib/attendance-sync";
import { ensureDefaultCourseExams } from "@/lib/exam-seed";
import {
  evaluateExamEligibility,
  sanitizeExamQuestionsForStudent,
} from "@/lib/exam-rules";
import { StudentExamRunner } from "@/components/student-exam-runner";

export const dynamic = "force-dynamic";

export default async function StudentExamPage({
  params,
}: {
  params: Promise<{ registrationId: string }>;
}) {
  const { registrationId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login/?next=/panel/exam/${encodeURIComponent(registrationId)}/`);
  }

  const lang = await getServerLang();
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
    redirect("/panel/");
  }

  const gantt = await syncAndGetRegistrationGantt(reg.id, lang);
  const progressPercent = gantt?.stats.progressPercent ?? 0;
  const exam = reg.course.exam;

  const eligibility = exam
    ? evaluateExamEligibility({
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
      })
    : { eligible: false, reason: "EXAM_UNPUBLISHED" as const };

  return (
    <main className="min-h-[100svh] py-10 sm:py-14 px-5 sm:px-8">
      <StudentExamRunner
        registrationId={reg.id}
        courseTitle={reg.course.title}
        courseTitleEn={reg.course.titleEn}
        courseSlug={reg.course.slug}
        progressPercent={progressPercent}
        examUnlocked={reg.examUnlocked}
        exam={
          exam
            ? {
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
              }
            : null
        }
        eligibility={eligibility}
        questions={
          exam && eligibility.eligible
            ? sanitizeExamQuestionsForStudent(exam.questions)
            : []
        }
        attempts={reg.examAttempts.map((a) => ({
          id: a.id,
          attemptNumber: a.attemptNumber,
          scorePercent: a.scorePercent,
          earnedPoints: a.earnedPoints,
          totalPoints: a.totalPoints,
          passed: a.passed,
          submittedAt: a.submittedAt.toISOString(),
        }))}
        certificate={
          reg.certificate && !reg.certificate.revokedAt
            ? {
                certificateCode: reg.certificate.certificateCode,
                scorePercent: reg.certificate.scorePercent,
                issuedAt: reg.certificate.issuedAt.toISOString(),
              }
            : null
        }
      />
    </main>
  );
}
