import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildCandidateImportReport } from "../js/candidate-bank.js";

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error("Usage: node scripts/import-candidate-bank.mjs <source.pdf> [output-directory]");
  process.exit(2);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.resolve(process.argv[3] || path.join(root, "data", "candidate-bank"));
const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "yue-candidate-bank-"));
const extractedPath = path.join(temporaryDirectory, "extracted.txt");

try {
  const extraction = spawnSync("pdftotext", ["-layout", "-enc", "UTF-8", pdfPath, extractedPath], {
    encoding: "utf8",
  });
  if (extraction.error || extraction.status !== 0) {
    console.error(extraction.error?.message || extraction.stderr || "pdftotext failed");
    process.exit(1);
  }
  const text = readFileSync(extractedPath, "utf8");
  const report = buildCandidateImportReport(text, path.basename(pdfPath));
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(path.join(outputDirectory, "import-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  const lines = [
    "# PDF 候選題庫審核報告",
    "",
    `- 來源：${report.sourceMetadata.sourceTitle}`,
    `- 授權／狀態：${report.sourceMetadata.license}；${report.sourceMetadata.status}`,
    `- 依PDF章節清冊盤點：${report.counts.cataloguedCandidates}`,
    `- 通過：${report.counts.approved}`,
    `- 退回：${report.counts.rejected}`,
    `- 待人工審核：${report.counts.needsReview}`,
    `- 學生可見：${report.counts.studentVisible}`,
    `- 解析判定：${report.extraction.reason}`,
    "",
    "PDF 內中文字型未嵌入可用 CMap，文字抽取為亂碼。本流程已阻擋題目進入正式題庫；",
    "僅保留各單元候選數量與視覺審閱參考，需人工逐題轉錄、驗算與品質審核後才能標記 approved。",
    "",
    "## 各大項候選分布",
    "",
    ...report.sections.map((section) => `- ${section.label}（${section.unitId}）：${section.candidateCount} 題，全部 needs-review`),
  ];
  writeFileSync(path.join(outputDirectory, "REVIEW_REPORT.md"), `${lines.join("\n")}\n`, "utf8");
  console.log(JSON.stringify(report.counts));
  if (!report.extraction.usable) process.exitCode = 3;
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
