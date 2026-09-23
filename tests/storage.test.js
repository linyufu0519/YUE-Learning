// tests/storage.test.js
// 以簡易 localStorage polyfill 測試 storage.js 的紀錄與統計邏輯。
import test from "node:test";
import assert from "node:assert/strict";
import { COURSE_STAGES } from "../js/course-stages.js";

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

function unlockSemesterLevel10(state) {
  state.semesterProgress.completedActions = Object.fromEntries(
    COURSE_STAGES.slice(0, 9).map((stage) => [stage.id, ["lesson", "practice", "mastery"]])
  );
}

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

test("recordAnswer 會保存選擇題型、選項與提示供錯題複習還原", () => {
  resetState();
  recordAnswer({
    unitId: "kx-unit1",
    questionId: "kx-choice-9",
    prompt: "9 是質數還是合數？",
    isCorrect: false,
    yourAnswer: "質數",
    correctAnswer: "合數",
    explanation: "9 還有因數 3。",
    type: "choice",
    choices: ["質數", "合數"],
    hint: "檢查 3 能否整除 9。",
    version: "kangxuan",
  });
  const [entry] = getWrongBook("kangxuan");
  assert.equal(entry.type, "choice");
  assert.deepEqual(entry.choices, ["質數", "合數"]);
  assert.equal(entry.hint, "檢查 3 能否整除 9。");
});

test("錯題重新答對會從正確版本錯題本移除並完成修正錯題任務", () => {
  resetState();
  const payload = {
    unitId: "kx-unit1",
    questionId: "kx1-prime-easy-1",
    prompt: "17 是質數還是合數？",
    yourAnswer: "合數",
    correctAnswer: "質數",
    explanation: "17 只有 1 和 17 兩個因數。",
    version: "kangxuan",
  };
  recordAnswer({ ...payload, isCorrect: false });
  assert.equal(getWrongBook("kangxuan").length, 1);
  assert.equal(getWrongBook("hanlin").length, 0);

  recordAnswer({ ...payload, isCorrect: true, yourAnswer: "質數" });
  assert.equal(getWrongBook("kangxuan").length, 0);
  assert.ok(loadState().progress.kangxuan.wrongBookResolvedAt["kx-unit1::kx1-prime-easy-1"]);
  assert.equal(getRewardSummary().daily.wrongFixedCount, 1);
  assert.equal(getRewardSummary().missions.find((m) => m.id === "fix-wrong").done, true);
});

test("錯題複習再次答錯會更新最新錯誤並保留在原版本錯題本", () => {
  resetState();
  const base = {
    unitId: "fraction-divide",
    questionId: "fd-review-1",
    prompt: "1/2 ÷ 1/3 = ?",
    correctAnswer: "3/2",
    explanation: "除以分數等於乘以倒數。",
    version: "hanlin",
  };
  recordAnswer({ ...base, isCorrect: false, yourAnswer: "1/6" });
  recordAnswer({ ...base, isCorrect: false, yourAnswer: "2/3" });
  const wrongBook = getWrongBook("hanlin");
  assert.equal(wrongBook.length, 1);
  assert.equal(wrongBook[0].yourAnswer, "2/3");
  assert.equal(getWrongBook("kangxuan").length, 0);
});

test("純本機：第一關訂正後再新增第二關錯題，不會復活第一關錯題", () => {
  resetState();
  const first = {
    unitId: "kx-unit1",
    stageId: "kx-unit1-stage-01",
    questionId: "stage1-wrong",
    prompt: "第一關測試題",
    correctAnswer: "2",
    explanation: "第一關解析",
    version: "kangxuan",
  };
  recordAnswer({ ...first, isCorrect: false, yourAnswer: "3" });
  recordAnswer({ ...first, isCorrect: true, yourAnswer: "2" });
  recordAnswer({
    unitId: "kx-unit1",
    stageId: "kx-unit1-stage-02",
    questionId: "stage2-wrong",
    prompt: "第二關測試題",
    correctAnswer: "6",
    explanation: "第二關解析",
    version: "kangxuan",
    isCorrect: false,
    yourAnswer: "5",
  });
  assert.deepEqual(
    getWrongBook("kangxuan").map((entry) => entry.questionId),
    ["stage2-wrong"]
  );
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

test("康軒關卡以實際5題題組完成練習，不足5題不算完成", () => {
  resetState();
  const stageId = COURSE_STAGES[0].id;
  recordPracticeSessionResult(false, stageId, 4);
  assert.equal(loadState().semesterProgress.completedActions?.[stageId]?.includes("practice") || false, false);
  recordPracticeSessionResult(false, stageId, 5);
  assert.equal(loadState().semesterProgress.completedActions[stageId].includes("practice"), true);
});

test("confirmLevelReward 等級已解鎖時家長可確認領取等級獎品", () => {
  resetState();
  const state = loadState();
  state.rewards.xp = 321; // 舊 XP 保留但不作為康軒六上獎品依據
  unlockSemesterLevel10(state);
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
  unlockSemesterLevel10(state);
  saveState(state);
  confirmLevelReward(10);
  const second = confirmLevelReward(10);
  assert.equal(second.ok, false);
});
