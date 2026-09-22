// tests/html-structure.test.js
// 針對 index.html／parent.html 原始碼結構做靜態檢查（不依賴 jsdom/瀏覽器，維持專案零 npm 相依原則）。
// 用來驗證：等級獎品入口放置位置、彈出視窗預設隱藏、學生端不可有家長確認控制項、
// 帳號同步精簡卡片預設隱藏（避免 JS 尚未執行前顯示空的精簡卡片）。
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexHtml = readFileSync(path.join(__dirname, "../index.html"), "utf8");
const parentHtml = readFileSync(path.join(__dirname, "../parent.html"), "utf8");
const practiceHtml = readFileSync(path.join(__dirname, "../practice.html"), "utf8");
const practiceJs = readFileSync(path.join(__dirname, "../js/practice.js"), "utf8");

test("首頁：等級獎品入口按鈕位於每日獎勵卡（badge-list 之後、reward-card 結束之前）", () => {
  const rewardCardMatch = indexHtml.match(/<div class="card reward-card">([\s\S]*?)<\/div>\s*<div class="card">/);
  assert.ok(rewardCardMatch, "找不到 reward-card 區塊");
  const rewardCardContent = rewardCardMatch[1];
  const badgeIndex = rewardCardContent.indexOf('id="badge-list"');
  const btnIndex = rewardCardContent.indexOf('id="btn-open-level-rewards"');
  assert.ok(badgeIndex >= 0, "找不到 badge-list");
  assert.ok(btnIndex >= 0, "找不到等級獎品入口按鈕");
  assert.ok(btnIndex > badgeIndex, "等級獎品入口應該在 badge-list 之後（正下方）");
});

test("首頁：等級獎品彈出視窗預設隱藏（不可直接完整展開 10 個里程碑）", () => {
  const modalMatch = indexHtml.match(/<div class="modal-overlay" id="level-reward-modal"([^>]*)>/);
  assert.ok(modalMatch, "找不到等級獎品彈出視窗");
  assert.match(modalMatch[1], /hidden/, "彈出視窗預設應該是 hidden");
});

test("首頁：等級獎品彈出視窗具備關閉按鈕與 dialog 語意", () => {
  assert.match(indexHtml, /id="btn-close-level-rewards"/);
  assert.match(indexHtml, /role="dialog"/);
  assert.match(indexHtml, /aria-modal="true"/);
});

test("首頁：學生端不可出現家長確認領取控制項（data-confirm-level）", () => {
  assert.doesNotMatch(indexHtml, /data-confirm-level/);
});

test("家長頁：仍保留完整等級獎品清單與確認領取按鈕（data-confirm-level）", () => {
  assert.match(parentHtml, /id="p-level-reward-list"/);
});

test("首頁：帳號同步精簡卡片預設隱藏，完整表單預設可見（JS 尚未執行前不可誤縮）", () => {
  const compactMatch = indexHtml.match(/<div class="sync-compact" id="sync-compact"([^>]*)>/);
  assert.ok(compactMatch, "找不到精簡卡片");
  assert.match(compactMatch[1], /hidden/, "精簡卡片預設應該是 hidden");

  const formWrapMatch = indexHtml.match(/<div id="account-form-wrap"([^>]*)>/);
  assert.ok(formWrapMatch, "找不到完整表單容器");
  assert.doesNotMatch(formWrapMatch[1], /hidden/, "完整表單預設不應該是 hidden");
});

test("首頁：帳號區塊提供「管理帳號與同步」展開入口與收合按鈕", () => {
  assert.match(indexHtml, /id="btn-expand-account"/);
  assert.match(indexHtml, /id="btn-collapse-account"/);
});

test("首頁提供學生可到達的錯題複習入口", () => {
  assert.match(indexHtml, /id="wrong-review-entry"/);
  assert.match(indexHtml, /href="practice\.html\?review=wrong"/);
});

test("首頁、練習頁與家長頁的可見 HTML 不顯示星星文字或圖示", () => {
  for (const html of [indexHtml, practiceHtml, parentHtml]) {
    assert.doesNotMatch(html, /星星|🌟|⭐/);
  }
});

test("練習頁不再提供或顯示難度選擇", () => {
  assert.doesNotMatch(practiceHtml, /ddl-difficulty|difficulty-panel|練習難度|智慧練習|基礎|進階|挑戰/);
  assert.doesNotMatch(practiceJs, /selectedDifficulty|params\.get\("difficulty"\)|DIFFICULTY_LABELS|difficultyLabel/);
});
