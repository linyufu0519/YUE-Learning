import { APPROVED_CANDIDATE_QUESTIONS } from "./approved-candidate-questions.js";

const SECTIONS = Object.freeze([
  { code: "u1", unitId: "kx-unit1", label: "第1單元", page: 1, count: 12 },
  { code: "u2", unitId: "kx-unit2", label: "第2單元", page: 2, count: 12 },
  { code: "u3", unitId: "kx-unit3", label: "第3單元", page: 3, count: 12 },
  { code: "u4", unitId: "kx-unit4", label: "第4單元", page: 4, count: 12 },
  { code: "u5", unitId: "kx-unit5", label: "第5單元", page: 5, count: 12 },
  { code: "r1", unitId: "kx-review1", label: "複習（一）", page: 6, count: 10 },
  { code: "u6", unitId: "kx-unit6", label: "第6單元", page: 7, count: 10 },
  { code: "u7", unitId: "kx-unit7", label: "第7單元", page: 8, count: 10 },
  { code: "u8", unitId: "kx-unit8", label: "第8單元", page: 9, count: 10 },
  { code: "u9", unitId: "kx-unit9", label: "第9單元", page: 10, count: 10 },
  { code: "r2", unitId: "kx-review2", label: "複習（二）與總複習", page: 11, count: 12 },
]);

const APPROVED_IDS = new Set(
  APPROVED_CANDIDATE_QUESTIONS.map((question) => question.sourceMetadata.originalCandidateId)
);

const CANDIDATE_ISSUES = Object.freeze({
  "pdf-u9-q10": {
    reason: "題目只提供照片長寬比 4：3 與放大 1.5 倍，沒有提供原始長或寬，無法唯一求出放大後的實際長寬。",
    ocrFragment: "一張照片長寬比為4：3，放大1.5倍後，長寬各是多少？",
  },
});

export const OCR_REVIEW_DECISIONS = Object.freeze(
  SECTIONS.flatMap((section) =>
    Array.from({ length: section.count }, (_, index) => {
      const questionNumber = index + 1;
      const id = `pdf-${section.code}-q${String(questionNumber).padStart(2, "0")}`;
      if (APPROVED_IDS.has(id)) {
        return Object.freeze({
          id,
          unitId: section.unitId,
          page: section.page,
          questionNumber,
          classification: "A",
          decision: "approved-and-integrated",
          reason: "OCR 與原頁核對完成；答案獨立重算，語意與單位完整，且可補充既有題庫結構。",
        });
      }
      if (CANDIDATE_ISSUES[id]) {
        return Object.freeze({
          id,
          unitId: section.unitId,
          page: section.page,
          questionNumber,
          classification: "C",
          decision: "parent-confirmation-required",
          ...CANDIDATE_ISSUES[id],
        });
      }
      return Object.freeze({
        id,
        unitId: section.unitId,
        page: section.page,
        questionNumber,
        classification: "B",
        decision: "reference-only",
        reason: "文字可可靠辨識，但屬例行直接計算、重複既有結構，或不符合目前關卡核心；只保留作題型參考。",
      });
    })
  )
);

export function buildOcrReviewSummary() {
  const counts = { A: 0, B: 0, C: 0 };
  for (const item of OCR_REVIEW_DECISIONS) counts[item.classification] += 1;
  return {
    counts,
    total: OCR_REVIEW_DECISIONS.length,
    sections: SECTIONS.map((section) => {
      const decisions = OCR_REVIEW_DECISIONS.filter((item) => item.unitId === section.unitId);
      return {
        unitId: section.unitId,
        label: section.label,
        page: section.page,
        candidateCount: section.count,
        A: decisions.filter((item) => item.classification === "A").length,
        B: decisions.filter((item) => item.classification === "B").length,
        C: decisions.filter((item) => item.classification === "C").length,
      };
    }),
  };
}
