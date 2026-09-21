// tests/storage.test.js
// 以簡易 localStorage polyfill 測試 storage.js 的紀錄與統計邏輯。
import test from "node:test";
import assert from "node:assert/strict";

function makeMemoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
  };
}

globalThis.localStorage = makeMemoryStorage();

const { recordAnswer, getUnitSummary, getStreak, getWrongBook, resetState } = await import(
  "../js/storage.js"
);

test("recordAnswer 累計作答次數與正確率", () => {
  resetState();
  recordAnswer({
    unitId: "fraction-multiply",
    questionId: "fm-01",
    prompt: "1/2 x 2/3",
    isCorrect: true,
    yourAnswer: "1/3",
    correctAnswer: "1/3",
    explanation: "說明",
  });
  recordAnswer({
    unitId: "fraction-multiply",
    questionId: "fm-02",
    prompt: "3/4 x 1/2",
    isCorrect: false,
    yourAnswer: "1/2",
    correctAnswer: "3/8",
    explanation: "說明",
  });

  const summary = getUnitSummary("fraction-multiply", 10);
  assert.equal(summary.attempts, 2);
  assert.equal(summary.correct, 1);
  assert.equal(summary.accuracy, 50);
  assert.equal(summary.progress, 20);
});

test("recordAnswer 答錯會加入錯題本", () => {
  resetState();
  recordAnswer({
    unitId: "fraction-divide",
    questionId: "fd-01",
    prompt: "1/2 ÷ 1/3",
    isCorrect: false,
    yourAnswer: "1/6",
    correctAnswer: "3/2",
    explanation: "說明",
  });
  const wrongBook = getWrongBook();
  assert.equal(wrongBook.length, 1);
  assert.equal(wrongBook[0].questionId, "fd-01");
});

test("recordAnswer 更新連續學習天數", () => {
  resetState();
  recordAnswer({
    unitId: "fraction-multiply",
    questionId: "fm-01",
    prompt: "q",
    isCorrect: true,
    yourAnswer: "a",
    correctAnswer: "a",
    explanation: "e",
  });
  const streak = getStreak();
  assert.equal(streak.count, 1);
  assert.ok(streak.lastDate);
});
