import test from "node:test";
import assert from "node:assert/strict";
import {
  CANDIDATE_SOURCE,
  assessCandidateExtraction,
  auditCandidateQuestion,
  approvedCandidateQuestions,
  buildCandidateImportReport,
} from "../js/candidate-bank.js";
import { APPROVED_CANDIDATE_QUESTIONS } from "../js/approved-candidate-questions.js";
import { OCR_REVIEW_DECISIONS, buildOcrReviewSummary } from "../js/candidate-review-decisions.js";

function candidate(overrides = {}) {
  return {
    id: "candidate-001",
    stageId: "kx-unit2-stage-05",
    unitId: "kx-unit2",
    difficulty: "medium",
    concept: "異分母分數除法｜candidate:solve",
    operationKey: "different-denominator-division",
    cognitiveMode: "solve",
    solutionSteps: ["乘以倒數", "約分"],
    type: "choice",
    prompt: "3/4 ÷ 1/2 = ？",
    answer: "3/2",
    choices: ["3/2", "2/3", "3/8", "1/4"],
    hint: "除以分數要乘以倒數。",
    explanation: "3/4 × 2 = 3/2。",
    sourceMetadata: {
      ...CANDIDATE_SOURCE,
      status: "quality-reviewed",
      originalCandidateId: "pdf-u2-q1",
      reviewStatus: "approved",
    },
    verification: { answerChecked: true, computedAnswer: "3/2" },
    qualityReview: {
      subjectConsistency: true,
      unitsComplete: true,
      conceptAligned: true,
      noAnswerLeakage: true,
      necessarySteps: true,
      wordingReviewed: true,
    },
    ...overrides,
  };
}

test("PDF文字抽取亂碼時明確阻擋，不讓候選題進學生題庫", () => {
  const result = assessCandidateExtraction("W\\Qm^t}ex[x\\QmNkˇe}L^« 3/4 1/2 ﬁ ˝ ł");
  assert.equal(result.usable, false);
  assert.equal(result.reason, "blocked-garbled-or-missing-cjk");
});

test("可讀中文抽取可進入人工逐題審核階段", () => {
  const text = "第2單元 分數除法。".repeat(30);
  assert.equal(assessCandidateExtraction(text).usable, true);
});

test("實際PDF章節盤點為122題，解析失敗時全部標為needs-review", () => {
  const report = buildCandidateImportReport("garbled ˇ ﬁ ˝", "source.pdf");
  assert.deepEqual(report.counts, {
    cataloguedCandidates: 122,
    approved: 0,
    rejected: 0,
    needsReview: 122,
    studentVisible: 0,
  });
  assert.equal(report.importDecision, "blocked-before-question-import");
});

test("通過題必須具來源metadata、答案驗算與完整品質覆核", () => {
  const result = auditCandidateQuestion(candidate());
  assert.equal(result.approved, true);
  const missingReview = auditCandidateQuestion(candidate({ qualityReview: {} }));
  assert.equal(missingReview.approved, false);
  assert.ok(missingReview.reasons.some((reason) => reason.startsWith("quality-failed:")));
});

test("選擇題若有等值的第二個數學正解會被退回", () => {
  const result = auditCandidateQuestion(candidate({
    answer: "1/2",
    choices: ["1/2", "2/4", "2", "1/4"],
    verification: { answerChecked: true, computedAnswer: "0.5" },
  }));
  assert.equal(result.approved, false);
  assert.ok(result.reasons.includes("choice-not-unique"));
});

test("未核准、分類錯誤及結構重複題不會進正式候選池", () => {
  const valid = candidate();
  const fingerprint = auditCandidateQuestion(valid).fingerprint;
  const unreviewed = candidate({
    id: "candidate-002",
    sourceMetadata: { ...valid.sourceMetadata, originalCandidateId: "pdf-u2-q2", reviewStatus: "needs-review" },
  });
  const wrongStage = candidate({ id: "candidate-003", unitId: "kx-unit3" });
  const result = approvedCandidateQuestions([valid, unreviewed, wrongStage], new Set([fingerprint]));
  assert.equal(result.approved.length, 0);
  assert.equal(result.review.length, 3);
  assert.ok(result.review.flatMap((item) => item.reasons).includes("duplicate-structure"));
  assert.ok(result.review.flatMap((item) => item.reasons).includes("not-approved"));
  assert.ok(result.review.flatMap((item) => item.reasons).includes("invalid-stage-classification"));
});

test("13頁OCR後122題皆有A/B/C決策，且分類統計完整", () => {
  const summary = buildOcrReviewSummary();
  assert.equal(OCR_REVIEW_DECISIONS.length, 122);
  assert.deepEqual(summary.counts, { A: 35, B: 86, C: 1 });
  assert.equal(summary.sections.length, 11);
  assert.equal(summary.sections.reduce((sum, section) => sum + section.candidateCount, 0), 122);
  assert.ok(OCR_REVIEW_DECISIONS.every((item) =>
    item.page >= 1 && item.page <= 11 && ["A", "B", "C"].includes(item.classification)
  ));
});

test("A類35題全部通過來源、答案、唯一正解與品質審核", () => {
  const result = approvedCandidateQuestions(APPROVED_CANDIDATE_QUESTIONS);
  assert.equal(APPROVED_CANDIDATE_QUESTIONS.length, 35);
  assert.equal(result.approved.length, 35);
  assert.deepEqual(result.review, []);
});

test("B/C類不進正式題庫，C類必須保留頁碼、OCR片段與疑點", () => {
  const approvedIds = new Set(
    APPROVED_CANDIDATE_QUESTIONS.map((question) => question.sourceMetadata.originalCandidateId)
  );
  const isolated = OCR_REVIEW_DECISIONS.filter((item) => item.classification !== "A");
  assert.ok(isolated.every((item) => !approvedIds.has(item.id)));
  const cItems = isolated.filter((item) => item.classification === "C");
  assert.equal(cItems.length, 1);
  assert.ok(cItems.every((item) => item.page && item.ocrFragment && item.reason));
  assert.match(cItems[0].reason, /無法唯一求出/);
});
