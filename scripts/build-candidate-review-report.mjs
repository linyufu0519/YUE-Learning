import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { APPROVED_CANDIDATE_QUESTIONS } from "../js/approved-candidate-questions.js";
import { CANDIDATE_SOURCE } from "../js/candidate-bank.js";
import { OCR_REVIEW_DECISIONS, buildOcrReviewSummary } from "../js/candidate-review-decisions.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(root, "data", "candidate-bank");
const sourceFileName = "6779e7b0-75a6-4149-b3a9-d33fae9c4b2b-國小六年級數學_六上每日題庫_第1-9單元與總複習.pdf";
const summary = buildOcrReviewSummary();
const cItems = OCR_REVIEW_DECISIONS.filter((item) => item.classification === "C");

const report = {
  schemaVersion: 2,
  sourceFileName,
  sourceMetadata: CANDIDATE_SOURCE,
  extraction: {
    usable: true,
    method: "page-image-rapidocr-manual-review",
    pageCount: 13,
    renderedPageCount: 13,
    questionPageCount: 11,
    answerPageCount: 2,
    renderScale: 3,
    pageMeanConfidenceRange: [0.969, 0.99],
    reason: "ocr-reviewed",
    notes: [
      "RapidOCR 辨識後逐頁對照原始 PNG，繁簡字、缺字、標點與單位均由人工覆核。",
      "PDF 答案區有多處數學錯答或錯置，A 類答案均由題幹獨立重算，不採用錯誤來源答案。",
    ],
  },
  counts: {
    cataloguedCandidates: summary.total,
    approved: summary.counts.A,
    referenceOnly: summary.counts.B,
    needsReview: summary.counts.C,
    studentVisible: APPROVED_CANDIDATE_QUESTIONS.length,
  },
  sections: summary.sections,
  importDecision: "approved-items-integrated-reference-and-review-items-isolated",
  reviewDecisions: OCR_REVIEW_DECISIONS,
};

const examples = APPROVED_CANDIDATE_QUESTIONS.slice(0, 5);
const markdown = [
  "# PDF 候選題庫 OCR 審核報告",
  "",
  `- 來源：${CANDIDATE_SOURCE.sourceTitle}`,
  `- 授權／狀態：${CANDIDATE_SOURCE.license}；${CANDIDATE_SOURCE.status}`,
  "- 解析方式：13 頁全部以 3× PNG 截圖後使用 RapidOCR，逐頁對照原圖並人工覆核",
  `- A 類（驗算與品質審核通過，已進正式題庫）：${summary.counts.A}`,
  `- B 類（僅作題型參考，不進學生題庫）：${summary.counts.B}`,
  `- C 類（資訊不足，待家長確認）：${summary.counts.C}`,
  `- 合計：${summary.total}`,
  "",
  "## 重要發現",
  "",
  "PDF 文字頁本身清楚，OCR 可可靠轉錄；但 PDF 的答案區有多處數學錯答或答案錯置。",
  "例如「半徑 5 公分的圓周長」來源答案列為 78.5，正確應為 31.4；",
  "「一個數除以 3/4 得 8」來源答案列為 3/4，正確應為 6。",
  "因此 A 類答案全部依題幹獨立重算，沒有沿用來源答案。",
  "",
  "## 各大項分類",
  "",
  ...summary.sections.map((section) =>
    `- ${section.label}（第 ${section.page} 頁）：A ${section.A}／B ${section.B}／C ${section.C}，共 ${section.candidateCount} 題`
  ),
  "",
  "## A 類完整範例",
  "",
  ...examples.flatMap((question) => [
    `### ${question.sourceMetadata.originalCandidateId}`,
    "",
    `- 關卡：${question.stageId}`,
    `- 題目：${question.prompt}`,
    `- 答案：${question.answer}`,
    `- 解析：${question.explanation}`,
    "",
  ]),
  "## C 類待家長確認",
  "",
  ...cItems.flatMap((item) => [
    `- 第 ${item.page} 頁第 ${item.questionNumber} 題（${item.id}）`,
    `  - OCR／原頁片段：${item.ocrFragment}`,
    `  - 疑點：${item.reason}`,
  ]),
  "",
  "## 隔離規則",
  "",
  "只有 A 類題目會由 `js/approved-candidate-questions.js` 加入對應關卡題池；",
  "B、C 類都只留在審核報告，不會顯示給學生，也不會影響既有 10 題結構配額。",
];

mkdirSync(outputDirectory, { recursive: true });
writeFileSync(path.join(outputDirectory, "import-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
writeFileSync(path.join(outputDirectory, "REVIEW_REPORT.md"), `${markdown.join("\n")}\n`, "utf8");
console.log(JSON.stringify(report.counts));
