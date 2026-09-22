// tests/logic.test.js
import test from "node:test";
import assert from "node:assert/strict";
import {
  parseFraction,
  fractionsEqual,
  gradeAnswer,
  calcAccuracy,
  updateStreak,
  computeUnitProgress,
  mergeWrongBook,
  canCompleteSelfCheck,
} from "../js/logic.js";

test("parseFraction 解析一般分數", () => {
  assert.deepEqual(parseFraction("3/4"), { num: 3, den: 4 });
});

test("parseFraction 解析帶分數", () => {
  assert.deepEqual(parseFraction("1又2/3"), { num: 5, den: 3 });
  assert.deepEqual(parseFraction("1 2/3"), { num: 5, den: 3 });
});

test("parseFraction 解析整數與非法輸入", () => {
  assert.deepEqual(parseFraction("5"), { num: 5, den: 1 });
  assert.equal(parseFraction("abc"), null);
  assert.equal(parseFraction(""), null);
});

test("fractionsEqual 判斷等值分數", () => {
  assert.equal(fractionsEqual({ num: 2, den: 6 }, { num: 1, den: 3 }), true);
  assert.equal(fractionsEqual({ num: 1, den: 2 }, { num: 1, den: 3 }), false);
});

test("gradeAnswer 選擇題比對", () => {
  const q = { type: "choice", answer: "1/3" };
  assert.equal(gradeAnswer(q, "1/3"), true);
  assert.equal(gradeAnswer(q, "2/3"), false);
});

test("gradeAnswer 輸入題允許未化簡分數", () => {
  const q = { type: "input", answer: "1/3" };
  assert.equal(gradeAnswer(q, "2/6"), true);
  assert.equal(gradeAnswer(q, "1/2"), false);
});

test("gradeAnswer 輸入題支援帶分數作答", () => {
  const q = { type: "input", answer: "1又1/2" };
  assert.equal(gradeAnswer(q, "3/2"), true);
});

test("calcAccuracy 計算正確率", () => {
  assert.equal(calcAccuracy(3, 4), 75);
  assert.equal(calcAccuracy(0, 0), 0);
});

test("updateStreak 首次學習與連續學習", () => {
  assert.equal(updateStreak(null, "2024-01-01"), 1);
  assert.equal(updateStreak("2024-01-01", "2024-01-02", 1), 2);
  assert.equal(updateStreak("2024-01-01", "2024-01-01", 3), 3);
});

test("updateStreak 中斷後歸零重算", () => {
  assert.equal(updateStreak("2024-01-01", "2024-01-05", 5), 1);
});

test("computeUnitProgress 計算單元完成度", () => {
  assert.equal(computeUnitProgress(5, 10), 50);
  assert.equal(computeUnitProgress(0, 0), 0);
});

test("mergeWrongBook 新增與更新錯題", () => {
  let book = [];
  book = mergeWrongBook(book, {
    unitId: "fraction-multiply",
    questionId: "fm-01",
    isCorrect: false,
  });
  assert.equal(book.length, 1);

  // 答對後應自動移除
  book = mergeWrongBook(book, {
    unitId: "fraction-multiply",
    questionId: "fm-01",
    isCorrect: true,
  });
  assert.equal(book.length, 0);
});

test("canCompleteSelfCheck 部分勾選不可完成", () => {
  assert.equal(canCompleteSelfCheck(3, 0), false);
  assert.equal(canCompleteSelfCheck(3, 2), false);
});

test("canCompleteSelfCheck 全部勾選才可完成", () => {
  assert.equal(canCompleteSelfCheck(3, 3), true);
  assert.equal(canCompleteSelfCheck(1, 1), true);
});

test("canCompleteSelfCheck 空自我檢查清單視為安全通過", () => {
  assert.equal(canCompleteSelfCheck(0, 0), true);
  assert.equal(canCompleteSelfCheck(undefined, 0), true);
  assert.equal(canCompleteSelfCheck(null, 0), true);
});

