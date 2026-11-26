import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { getServerLang } from "@/lib/i18n";
import { ensureDefaultCourseExams } from "@/lib/exam-seed";
import { parseExamOptions } from "@/lib/exam-rules";
import { ExamsManager } from "@/components/exams-manager";

export const dynamic = "force-dynamic";

export default async function DashboardExamsPage() {
  const lang = await getServerLang();
  const fa = lang === "fa";
  const user = await requirePermission("course.update");
  if (!user) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        {fa ? "دسترسی مجاز نیست" : "Access denied"}
      </div>
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
        student: { select: { phone: true } },
        course: { select: { slug: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          {fa ? "ارزیابی پایان دوره و صدور مدرک معتبر" : "Final Assessment & Accredited Certificates"}
        </p>
        <h1 className="text-3xl sm:text-4xl font-medium tracking-[-0.03em]">
          {fa ? "آزمون و گواهینامه دوره‌ها" : "Course Exams & Certificates"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {fa
            ? "طراحی آزمون پایان دوره، تولید سوال با هوش مصنوعی و مدیریت گواهینامه‌های رمزنگاری‌شده هنرآموزان."
            : "Configure final exams, draft syllabus-aligned questions with AI, and verify issued certificates."}
        </p>
      </div>

      <ExamsManager
        initialCourses={courses.map((c) => ({
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
        }))}
        initialCertificates={certificates.map((cert) => ({
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
        }))}
      />
    </div>
  );
}
