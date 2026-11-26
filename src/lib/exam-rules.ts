import { createHmac } from "crypto";

export type ExamOption = {
  id: string;
  text: string;
  textEn?: string;
};

export type RawExamQuestion = {
  id: string;
  order: number;
  prompt: string;
  promptEn?: string | null;
  optionsJson: string;
  correctOptionId: string;
  explanation?: string | null;
  explanationEn?: string | null;
  points: number;
};

export type StudentQuestionPayload = {
  id: string;
  order: number;
  prompt: string;
  promptEn: string | null;
  options: ExamOption[];
  points: number;
};

export type GradedQuestionResult = {
  questionId: string;
  selectedOptionId: string | null;
  correctOptionId: string;
  isCorrect: boolean;
  earnedPoints: number;
  totalPoints: number;
  explanation: string;
  explanationEn: string;
};

export type ExamEligibilityResult = {
  eligible: boolean;
  reason:
    | "READY"
    | "UNCONFIRMED_REGISTRATION"
    | "EXAM_UNPUBLISHED"
    | "NO_QUESTIONS"
    | "PROGRESS_TOO_LOW"
    | "MAX_ATTEMPTS_REACHED"
    | "ALREADY_PASSED";
};

export function parseExamOptions(optionsJson: string): ExamOption[] {
  try {
    const parsed = JSON.parse(optionsJson) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: ExamOption[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const o = item as { id?: unknown; text?: unknown; textEn?: unknown };
      const id = String(o.id ?? "").trim();
      const text = String(o.text ?? "").trim();
      const textEn = typeof o.textEn === "string" ? o.textEn.trim() : undefined;
      if (id && text) {
        out.push({ id, text, ...(textEn ? { textEn } : {}) });
      }
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Strips correctOptionId and answer explanations before sending exam questions to students.
 */
export function sanitizeExamQuestionsForStudent(
  questions: RawExamQuestion[],
): StudentQuestionPayload[] {
  return [...questions]
    .sort((a, b) => a.order - b.order)
    .map((q) => ({
      id: q.id,
      order: q.order,
      prompt: q.prompt,
      promptEn: q.promptEn ?? null,
      options: parseExamOptions(q.optionsJson),
      points: Math.max(1, Math.floor(q.points || 1)),
    }));
}

export function evaluateExamEligibility(params: {
  registrationStatus: string;
  isPublished: boolean;
  questionCount: number;
  progressPercent: number;
  minProgressPercent: number;
  requireCourseCompletion: boolean;
  examUnlocked: boolean;
  attemptsUsed: number;
  maxAttempts: number;
  hasCertificate: boolean;
}): ExamEligibilityResult {
  if (params.registrationStatus !== "CONFIRMED") {
    return { eligible: false, reason: "UNCONFIRMED_REGISTRATION" };
  }
  if (!params.isPublished) {
    return { eligible: false, reason: "EXAM_UNPUBLISHED" };
  }
  if (params.questionCount <= 0) {
    return { eligible: false, reason: "NO_QUESTIONS" };
  }
  if (params.hasCertificate) {
    return { eligible: false, reason: "ALREADY_PASSED" };
  }
  if (
    params.requireCourseCompletion &&
    !params.examUnlocked &&
    params.progressPercent < params.minProgressPercent
  ) {
    return { eligible: false, reason: "PROGRESS_TOO_LOW" };
  }
  if (params.attemptsUsed >= params.maxAttempts) {
    return { eligible: false, reason: "MAX_ATTEMPTS_REACHED" };
  }
  return { eligible: true, reason: "READY" };
}

export function gradeExamSubmission(params: {
  questions: RawExamQuestion[];
  submittedAnswers: Record<string, string>;
  passingScore: number;
}): {
  scorePercent: number;
  earnedPoints: number;
  totalPoints: number;
  passed: boolean;
  breakdown: GradedQuestionResult[];
} {
  let earnedPoints = 0;
  let totalPoints = 0;
  const breakdown: GradedQuestionResult[] = [];

  for (const q of [...params.questions].sort((a, b) => a.order - b.order)) {
    const pts = Math.max(1, Math.floor(q.points || 1));
    totalPoints += pts;
    const selectedRaw = params.submittedAnswers[q.id];
    const selectedOptionId =
      typeof selectedRaw === "string" && selectedRaw.trim() ? selectedRaw.trim() : null;
    const isCorrect = Boolean(selectedOptionId && selectedOptionId === q.correctOptionId);
    const earned = isCorrect ? pts : 0;
    earnedPoints += earned;
    breakdown.push({
      questionId: q.id,
      selectedOptionId,
      correctOptionId: q.correctOptionId,
      isCorrect,
      earnedPoints: earned,
      totalPoints: pts,
      explanation: q.explanation ?? "",
      explanationEn: q.explanationEn ?? "",
    });
  }

  const scorePercent =
    totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const passed = totalPoints > 0 && scorePercent >= params.passingScore;

  return {
    scorePercent,
    earnedPoints,
    totalPoints,
    passed,
    breakdown,
  };
}

export function buildCertificateCode(
  courseSlug: string,
  year: number = new Date().getUTCFullYear(),
  suffixHex?: string,
): string {
  const slugTag =
    courseSlug
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 4) || "ARCH";
  const hex =
    suffixHex?.replace(/[^a-fA-F0-9]/g, "").toUpperCase().slice(0, 6) ||
    Math.floor(0x100000 + Math.random() * 0x8fffff)
      .toString(16)
      .toUpperCase();
  return `NLA-${year}-${slugTag}-${hex}`;
}

export function computeCertificateVerificationHash(
  params: {
    certificateCode: string;
    studentId: string;
    courseId: string;
    scorePercent: number;
  },
  secret: string,
): string {
  const payload = `${params.certificateCode}|${params.studentId}|${params.courseId}|${params.scorePercent}`;
  return createHmac("sha256", secret).update(payload).digest("hex").slice(0, 32);
}
