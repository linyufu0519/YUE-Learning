import { gradeAnswer } from "./logic.js";
import { getStageById } from "./course-stages.js";

export const CANDIDATE_SOURCE = Object.freeze({
  source: "parent-provided-pdf",
  sourceTitle: "國小六年級數學｜六上每日練習題庫",
  license: "家長提供的候選內容／內部草稿",
  status: "quality-review-required",
});

export const PDF_SECTION_COUNTS = Object.freeze([
  { unitId: "kx-unit1", label: "第1單元", candidateCount: 12 },
  { unitId: "kx-unit2", label: "第2單元", candidateCount: 12 },
  { unitId: "kx-unit3", label: "第3單元", candidateCount: 12 },
  { unitId: "kx-unit4", label: "第4單元", candidateCount: 12 },
  { unitId: "kx-unit5", label: "第5單元", candidateCount: 12 },
  { unitId: "kx-review1", label: "複習（一）", candidateCount: 10 },
  { unitId: "kx-unit6", label: "第6單元", candidateCount: 10 },
  { unitId: "kx-unit7", label: "第7單元", candidateCount: 10 },
  { unitId: "kx-unit8", label: "第8單元", candidateCount: 10 },
  { unitId: "kx-unit9", label: "第9單元", candidateCount: 10 },
  { unitId: "kx-review2", label: "複習（二）與總複習", candidateCount: 12 },
]);

export function assessCandidateExtraction(text) {
  const source = String(text || "");
  const visible = (source.match(/[^\s_]/g) || []).length;
  const cjk = (source.match(/[\u3400-\u9fff]/g) || []).length;
  const suspicious = (source.match(/[ˇﬁ˝ł‡‰ºœªˆø]/g) || []).length;
  const cjkRatio = visible ? cjk / visible : 0;
  const suspiciousRatio = visible ? suspicious / visible : 1;
  const usable = visible >= 100 && cjk >= 50 && cjkRatio >= 0.12 && suspiciousRatio < 0.01;
  return {
    usable,
    visibleCharacters: visible,
    cjkCharacters: cjk,
    cjkRatio: Number(cjkRatio.toFixed(4)),
    suspiciousCharacters: suspicious,
    suspiciousRatio: Number(suspiciousRatio.toFixed(4)),
    reason: usable ? "text-extraction-usable" : "blocked-garbled-or-missing-cjk",
  };
}

export function buildCandidateImportReport(text, sourceFileName) {
  const extraction = assessCandidateExtraction(text);
  const total = PDF_SECTION_COUNTS.reduce((sum, section) => sum + section.candidateCount, 0);
  return {
    schemaVersion: 1,
    sourceFileName,
    sourceMetadata: CANDIDATE_SOURCE,
    extraction,
    counts: {
      cataloguedCandidates: total,
      approved: 0,
      rejected: 0,
      needsReview: total,
      studentVisible: 0,
    },
    sections: PDF_SECTION_COUNTS,
    importDecision: extraction.usable ? "manual-question-review-required" : "blocked-before-question-import",
  };
}

export function getCandidateStructureFingerprint(candidate) {
  const operationKey = candidate.operationKey || "missing-operation";
  const cognitiveMode = candidate.cognitiveMode || "missing-mode";
  const steps = Array.isArray(candidate.solutionSteps) ? candidate.solutionSteps.length : 0;
  return `${operationKey}|${cognitiveMode}|${candidate.type}|steps:${steps}`;
}

function mathematicallyCorrect(candidate, value) {
  return gradeAnswer({ ...candidate, type: "input" }, value);
}

export function auditCandidateQuestion(candidate, existingFingerprints = new Set()) {
  const reasons = [];
  const required = ["id", "stageId", "unitId", "difficulty", "concept", "type", "prompt", "answer", "hint", "explanation"];
  for (const key of required) {
    if (candidate?.[key] === undefined || candidate[key] === "") reasons.push(`missing:${key}`);
  }
  const stage = getStageById(candidate?.stageId);
  if (!stage || stage.unitId !== candidate?.unitId) reasons.push("invalid-stage-classification");
  const metadata = candidate?.sourceMetadata || {};
  for (const key of ["source", "sourceTitle", "license", "status", "originalCandidateId", "reviewStatus"]) {
    if (!metadata[key]) reasons.push(`missing-source-metadata:${key}`);
  }
  if (metadata.source !== CANDIDATE_SOURCE.source) reasons.push("invalid-source");
  if (metadata.license !== CANDIDATE_SOURCE.license) reasons.push("invalid-license-label");
  if (metadata.status !== "quality-reviewed" || metadata.reviewStatus !== "approved") reasons.push("not-approved");
  if (!candidate?.verification?.answerChecked || !mathematicallyCorrect(candidate, candidate.verification.computedAnswer)) {
    reasons.push("answer-not-verified");
  }
  if (candidate?.type === "choice") {
    const accepted = (candidate.choices || []).filter((choice) => mathematicallyCorrect(candidate, choice));
    if (accepted.length !== 1) reasons.push("choice-not-unique");
  }
  const quality = candidate?.qualityReview || {};
  for (const key of ["subjectConsistency", "unitsComplete", "conceptAligned", "noAnswerLeakage", "necessarySteps", "wordingReviewed"]) {
    if (quality[key] !== true) reasons.push(`quality-failed:${key}`);
  }
  const fingerprint = getCandidateStructureFingerprint(candidate || {});
  if (existingFingerprints.has(fingerprint)) reasons.push("duplicate-structure");
  if (/^【.+｜.+】/.test(candidate?.prompt || "")) reasons.push("internal-label-visible");
  return { approved: reasons.length === 0, reasons, fingerprint };
}

export function approvedCandidateQuestions(candidates, existingFingerprints = new Set()) {
  const fingerprints = new Set(existingFingerprints);
  const approved = [];
  const review = [];
  for (const candidate of candidates) {
    const result = auditCandidateQuestion(candidate, fingerprints);
    if (!result.approved) {
      review.push({ originalCandidateId: candidate?.sourceMetadata?.originalCandidateId || candidate?.id, reasons: result.reasons });
      continue;
    }
    fingerprints.add(result.fingerprint);
    approved.push(candidate);
  }
  return { approved, review };
}
