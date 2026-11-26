import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCertificateCode,
  computeCertificateVerificationHash,
  evaluateExamEligibility,
  gradeExamSubmission,
  sanitizeExamQuestionsForStudent,
  type RawExamQuestion,
} from "./exam-rules";

const SAMPLE_QUESTIONS: RawExamQuestion[] = [
  {
    id: "q1",
    order: 1,
    prompt: "Which Revit tool controls visibility per view?",
    promptEn: "Which Revit tool controls visibility per view?",
    optionsJson: JSON.stringify([
      { id: "a", text: "Visibility/Graphics (VG)" },
      { id: "b", text: "Purge Unused" },
    ]),
    correctOptionId: "a",
    explanation: "VG overrides category visibility for the active view.",
    explanationEn: "VG overrides category visibility for the active view.",
    points: 2,
  },
  {
    id: "q2",
    order: 2,
    prompt: "What does LOD 350 represent?",
    promptEn: "What does LOD 350 represent?",
    optionsJson: JSON.stringify([
      { id: "a", text: "Concept massing only" },
      { id: "b", text: "Interface & coordination detail" },
    ]),
    correctOptionId: "b",
    explanation: "LOD 350 includes element interfaces with other building systems.",
    explanationEn: "LOD 350 includes element interfaces with other building systems.",
    points: 2,
  },
];

test("sanitizeExamQuestionsForStudent strips correctOptionId and explanation", () => {
  const sanitized = sanitizeExamQuestionsForStudent(SAMPLE_QUESTIONS);
  assert.equal(sanitized.length, 2);
  assert.equal("correctOptionId" in sanitized[0], false);
  assert.equal("explanation" in sanitized[0], false);
  assert.equal(sanitized[0].options.length, 2);
});

test("evaluateExamEligibility checks progress, admin override, and attempts", () => {
  assert.equal(
    evaluateExamEligibility({
      registrationStatus: "PENDING",
      isPublished: true,
      questionCount: 2,
      progressPercent: 100,
      minProgressPercent: 70,
      requireCourseCompletion: true,
      examUnlocked: false,
      attemptsUsed: 0,
      maxAttempts: 3,
      hasCertificate: false,
    }).reason,
    "UNCONFIRMED_REGISTRATION",
  );

  assert.equal(
    evaluateExamEligibility({
      registrationStatus: "CONFIRMED",
      isPublished: true,
      questionCount: 2,
      progressPercent: 40,
      minProgressPercent: 70,
      requireCourseCompletion: true,
      examUnlocked: false,
      attemptsUsed: 0,
      maxAttempts: 3,
      hasCertificate: false,
    }).reason,
    "PROGRESS_TOO_LOW",
  );

  // Admin unlock overrides progress threshold
  assert.equal(
    evaluateExamEligibility({
      registrationStatus: "CONFIRMED",
      isPublished: true,
      questionCount: 2,
      progressPercent: 10,
      minProgressPercent: 70,
      requireCourseCompletion: true,
      examUnlocked: true,
      attemptsUsed: 0,
      maxAttempts: 3,
      hasCertificate: false,
    }).eligible,
    true,
  );

  // Max attempts blocks further tries
  assert.equal(
    evaluateExamEligibility({
      registrationStatus: "CONFIRMED",
      isPublished: true,
      questionCount: 2,
      progressPercent: 90,
      minProgressPercent: 70,
      requireCourseCompletion: true,
      examUnlocked: false,
      attemptsUsed: 3,
      maxAttempts: 3,
      hasCertificate: false,
    }).reason,
    "MAX_ATTEMPTS_REACHED",
  );
});

test("gradeExamSubmission computes accurate score and pass/fail", () => {
  const passResult = gradeExamSubmission({
    questions: SAMPLE_QUESTIONS,
    submittedAnswers: { q1: "a", q2: "b" },
    passingScore: 70,
  });
  assert.equal(passResult.scorePercent, 100);
  assert.equal(passResult.earnedPoints, 4);
  assert.equal(passResult.totalPoints, 4);
  assert.equal(passResult.passed, true);

  const failResult = gradeExamSubmission({
    questions: SAMPLE_QUESTIONS,
    submittedAnswers: { q1: "a", q2: "a" },
    passingScore: 70,
  });
  assert.equal(failResult.scorePercent, 50);
  assert.equal(failResult.passed, false);
});

test("certificate code and HMAC verification hash are deterministic", () => {
  const code = buildCertificateCode("revit-bim", 2026, "ab12cd");
  assert.equal(code, "NLA-2026-REVI-AB12CD");
  const h1 = computeCertificateVerificationHash(
    { certificateCode: code, studentId: "u1", courseId: "c1", scorePercent: 95 },
    "secret-key",
  );
  const h2 = computeCertificateVerificationHash(
    { certificateCode: code, studentId: "u1", courseId: "c1", scorePercent: 95 },
    "secret-key",
  );
  const h3 = computeCertificateVerificationHash(
    { certificateCode: code, studentId: "u1", courseId: "c1", scorePercent: 90 },
    "secret-key",
  );
  assert.equal(h1, h2);
  assert.notEqual(h1, h3);
});
