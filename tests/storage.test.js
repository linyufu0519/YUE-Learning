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

const { recordAnswer, getUnitSummary, getStreak, getWrongBook, resetState, recordLessonRead, isLessonCompletedBefore, recordPracticeSessionResult, getRewardSummary, confirmLevelReward, loadState, saveState } = await import(
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

test("isLessonCompletedBefore 尚未讀過回傳 false（模擬重新載入頁面）", () => {
  resetState();
  assert.equal(isLessonCompletedBefore("fraction-multiply"), false);
});

test("isLessonCompletedBefore 讀過教學後回傳 true（模擬重新載入頁面仍顯示已完成）", () => {
  resetState();
  recordLessonRead("fraction-multiply");
  assert.equal(isLessonCompletedBefore("fraction-multiply"), true);
  // 其他單元不受影響
  assert.equal(isLessonCompletedBefore("fraction-divide"), false);
});

test("recordPracticeSessionResult 全部答對可完成「全部答對或修正錯題」任務", () => {
  resetState();
  recordPracticeSessionResult(true);
  const mission = getRewardSummary().missions.find((m) => m.id === "fix-wrong");
  assert.equal(mission.done, true);
});

test("recordPracticeSessionResult 未全對時任務尚未完成", () => {
  resetState();
  recordPracticeSessionResult(false);
  const mission = getRewardSummary().missions.find((m) => m.id === "fix-wrong");
  assert.equal(mission.done, false);
});

test("recordPracticeSessionResult 同一天重複全對練習不重複發獎", () => {
  resetState();
  recordPracticeSessionResult(true);
  const rewardsAfterFirst = getRewardSummary();
  const xpAfterFirst = rewardsAfterFirst.xp;
  const starsAfterFirst = rewardsAfterFirst.stars;
  recordPracticeSessionResult(true);
  const rewardsAfterSecond = getRewardSummary();
  assert.equal(rewardsAfterSecond.xp, xpAfterFirst);
  assert.equal(rewardsAfterSecond.stars, starsAfterFirst);
});

test("confirmLevelReward 等級已解鎖時家長可確認領取等級獎品", () => {
  resetState();
  const state = loadState();
  state.rewards.xp = 9 * 100; // 直接設為 10 級，避免測試需要作答上百題
  saveState(state);
  const result = confirmLevelReward(10);
  assert.equal(result.ok, true);
  const rewards = getRewardSummary();
  assert.equal(rewards.levelRewards.milestones.find((m) => m.level === 10).confirmed, true);
});

test("confirmLevelReward 尚未解鎖的等級無法確認領取", () => {
  resetState();
  const result = confirmLevelReward(10);
  assert.equal(result.ok, false);
});

test("confirmLevelReward 同一里程碑不能重複確認領取（避免重複發放零用錢）", () => {
  resetState();
  const state = loadState();
  state.rewards.xp = 9 * 100;
  saveState(state);
  confirmLevelReward(10);
  const second = confirmLevelReward(10);
  assert.equal(second.ok, false);
});
