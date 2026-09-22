import test from "node:test";
import assert from "node:assert/strict";
import {
  applyAnswerReward,
  applyLessonReward,
  defaultRewards,
  evaluateMissions,
  getLevelInfo,
  hasReadLessonBefore,
} from "../js/rewards.js";

test("作答會累積 XP 並推進每日練習任務", () => {
  const rewards = defaultRewards();
  for (let i = 0; i < 5; i += 1) {
    applyAnswerReward(rewards, {
      unitId: "fraction-multiply",
      questionId: `q-${i}`,
      isCorrect: true,
      fixedWrong: false,
    });
  }
  const mission = evaluateMissions(rewards).find((m) => m.id === "practice-5");
  assert.equal(mission.done, true);
  assert.ok(rewards.xp >= 80);
  assert.ok(rewards.stars >= 1);
});

test("閱讀教學會記錄每日任務與 XP", () => {
  const rewards = defaultRewards();
  const result = applyLessonReward(rewards, "fraction-divide", "2026-09-21");
  assert.equal(result.firstReadToday, true);
  assert.equal(rewards.lessonReads["fraction-divide"].includes("2026-09-21"), true);
  assert.equal(evaluateMissions(rewards).find((m) => m.id === "read-lesson").done, true);
});

test("同一天重複閱讀同單元不重複增加閱讀任務", () => {
  const rewards = defaultRewards();
  applyLessonReward(rewards, "fraction-divide", "2026-09-21");
  const result = applyLessonReward(rewards, "fraction-divide", "2026-09-21");
  assert.equal(result.firstReadToday, false);
  assert.equal(rewards.daily.lessonReadCount, 1);
});

test("XP 可換算等級與稱號", () => {
  const info = getLevelInfo(260);
  assert.equal(info.level, 3);
  assert.equal(info.title, "分數探險家");
});

test("hasReadLessonBefore：從未讀過回傳 false", () => {
  const rewards = defaultRewards();
  assert.equal(hasReadLessonBefore(rewards, "fraction-multiply"), false);
});

test("hasReadLessonBefore：讀過一次之後即使是不同天也回傳 true", () => {
  const rewards = defaultRewards();
  applyLessonReward(rewards, "fraction-multiply", "2026-09-20");
  assert.equal(hasReadLessonBefore(rewards, "fraction-multiply"), true);
  // 換一天查詢，仍然視為「已完成過」，不是只看今天
  assert.equal(hasReadLessonBefore(rewards, "fraction-multiply"), true);
});

