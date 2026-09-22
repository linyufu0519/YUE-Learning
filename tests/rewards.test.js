import test from "node:test";
import assert from "node:assert/strict";
import {
  DAILY_MISSIONS,
  applyAnswerReward,
  applyLessonReward,
  applyPracticeSessionReward,
  confirmLevelRewardMilestone,
  defaultRewards,
  evaluateMissions,
  getLevelInfo,
  getLevelRewardsSummary,
  getMilestoneAmount,
  hasReadLessonBefore,
  normalizeRewards,
} from "../js/rewards.js";

test("完成 10 題練習只由每日任務發放 50 XP 與 1 顆星星", () => {
  const rewards = defaultRewards();
  for (let i = 0; i < 9; i += 1) {
    applyAnswerReward(rewards, {
      unitId: "fraction-multiply",
      questionId: `q-${i}`,
      isCorrect: true,
      fixedWrong: false,
    });
  }
  assert.equal(rewards.xp, 0);
  assert.equal(rewards.stars, 0);
  applyAnswerReward(rewards, {
    unitId: "fraction-multiply",
    questionId: "q-9",
    isCorrect: true,
    fixedWrong: false,
  });
  const mission = evaluateMissions(rewards).find((m) => m.id === "practice-5");
  assert.equal(mission.target, 10);
  assert.equal(mission.done, true);
  assert.equal(rewards.xp, 50);
  assert.equal(rewards.stars, 1);
  applyAnswerReward(rewards, {
    unitId: "fraction-multiply",
    questionId: "q-10",
    isCorrect: true,
    fixedWrong: false,
  });
  assert.equal(rewards.xp, 50);
  assert.equal(rewards.stars, 1);
});

test("單題答對或答錯都不直接增加 XP 與星星", () => {
  const rewards = defaultRewards();
  const correct = applyAnswerReward(rewards, {
    unitId: "fraction-multiply",
    questionId: "q-correct",
    isCorrect: true,
  });
  const wrong = applyAnswerReward(rewards, {
    unitId: "fraction-multiply",
    questionId: "q-wrong",
    isCorrect: false,
  });
  assert.equal(rewards.xp, 0);
  assert.equal(rewards.stars, 0);
  for (const message of [correct.message, wrong.message]) {
    assert.doesNotMatch(message, /XP|星星|⭐|🌟/);
  }
});

test("未滿 10 題練習時，練習任務尚未完成", () => {
  const rewards = defaultRewards();
  for (let i = 0; i < 9; i += 1) {
    applyAnswerReward(rewards, {
      unitId: "fraction-multiply",
      questionId: `q-${i}`,
      isCorrect: true,
      fixedWrong: false,
    });
  }
  const mission = evaluateMissions(rewards).find((m) => m.id === "practice-5");
  assert.equal(mission.done, false);
});

test("閱讀教學會記錄每日任務與 XP", () => {
  const rewards = defaultRewards();
  const result = applyLessonReward(rewards, "fraction-divide", "2026-09-21");
  assert.equal(result.firstReadToday, true);
  assert.equal(rewards.lessonReads["fraction-divide"].includes("2026-09-21"), true);
  assert.equal(evaluateMissions(rewards).find((m) => m.id === "read-lesson").done, true);
  assert.equal(rewards.xp, 25);
  assert.equal(rewards.stars, 1);
});

test("同一天重複閱讀同單元不重複增加閱讀任務", () => {
  const rewards = defaultRewards();
  applyLessonReward(rewards, "fraction-divide", "2026-09-21");
  const xpAfterFirst = rewards.xp;
  const starsAfterFirst = rewards.stars;
  const result = applyLessonReward(rewards, "fraction-divide", "2026-09-21");
  assert.equal(result.firstReadToday, false);
  assert.equal(rewards.daily.lessonReadCount, 1);
  assert.equal(rewards.xp, xpAfterFirst);
  assert.equal(rewards.stars, starsAfterFirst);
});

test("等級稱號依新規則正確對應全部邊界", () => {
  const cases = [
    [1, "玥玥剛出新手村"],
    [10, "玥玥剛出新手村"],
    [11, "數學難不倒我"],
    [30, "數學難不倒我"],
    [31, "數學小老師"],
    [50, "數學小老師"],
    [51, "數學天才"],
    [99, "數學天才"],
    [100, "數學大師玥玥"],
    [101, "數學大師玥玥"],
  ];
  for (const [level, title] of cases) {
    assert.equal(getLevelInfo((level - 1) * 100).level, level);
    assert.equal(getLevelInfo((level - 1) * 100).title, title);
  }
});

test("每累積 100 XP 升一級，等級進度條以 100 XP 為週期", () => {
  assert.deepEqual(getLevelInfo(0), {
    level: 1,
    title: "玥玥剛出新手村",
    currentLevelXp: 0,
    nextLevelXp: 100,
    progress: 0,
  });
  assert.equal(getLevelInfo(50).progress, 50);
  assert.equal(getLevelInfo(99).level, 1);
  assert.equal(getLevelInfo(100).level, 2);
  assert.equal(getLevelInfo(100).progress, 0);
});

test("等級稱號不殘留舊稱號字串", () => {
  const oldTitles = ["學習新星", "分數探險家", "解題高手", "數學小博士"];
  for (const level of [1, 10, 11, 30, 31, 50, 51, 99, 100, 101]) {
    const title = getLevelInfo((level - 1) * 100).title;
    for (const oldTitle of oldTitles) {
      assert.notEqual(title, oldTitle);
    }
  }
});

test("舊資料的歷史 XP 與星星會原樣保留，不回溯修正", () => {
  const rewards = normalizeRewards({ xp: 987, stars: 42 });
  assert.equal(rewards.xp, 987);
  assert.equal(rewards.stars, 42);
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

test("applyPracticeSessionReward：一次練習全對可以完成「全部答對或修正錯題」任務", () => {
  const rewards = defaultRewards();
  const result = applyPracticeSessionReward(rewards, { allCorrect: true }, "2026-09-22");
  const mission = evaluateMissions(rewards).find((m) => m.id === "fix-wrong");
  assert.equal(mission.done, true);
  assert.equal(rewards.xp, 25);
  assert.equal(rewards.stars, 1);
  assert.ok(result.message.length > 0);
});

test("applyPracticeSessionReward：修正錯題（既有路徑）仍可完成任務", () => {
  const rewards = defaultRewards();
  applyAnswerReward(rewards, {
    unitId: "fraction-multiply",
    questionId: "q-fix",
    isCorrect: true,
    fixedWrong: true,
  });
  const mission = evaluateMissions(rewards).find((m) => m.id === "fix-wrong");
  assert.equal(mission.done, true);
  assert.equal(rewards.xp, 25);
  assert.equal(rewards.stars, 1);
});

test("applyPracticeSessionReward：練習未全對時任務尚未完成，也不會提早發獎", () => {
  const rewards = defaultRewards();
  applyPracticeSessionReward(rewards, { allCorrect: false }, "2026-09-22");
  const mission = evaluateMissions(rewards).find((m) => m.id === "fix-wrong");
  assert.equal(mission.done, false);
  assert.equal(rewards.xp, 0);
  assert.equal(rewards.stars, 0);
});

test("applyPracticeSessionReward：同一天完成過就不會重複發獎（全對 + 修正錯題都達成也只算一次）", () => {
  const rewards = defaultRewards();
  applyPracticeSessionReward(rewards, { allCorrect: true }, "2026-09-22");
  const xpAfterFirst = rewards.xp;
  const starsAfterFirst = rewards.stars;
  // 同一天再打完一次全對的練習
  applyPracticeSessionReward(rewards, { allCorrect: true }, "2026-09-22");
  // 同一天再修正一題錯題
  applyAnswerReward(rewards, {
    unitId: "fraction-multiply",
    questionId: "q-fix-2",
    isCorrect: true,
    fixedWrong: true,
  });
  assert.equal(rewards.xp, xpAfterFirst);
  assert.equal(rewards.stars, starsAfterFirst);
});

test("每日任務獎勵固定為 50／25／25 XP，且每項都是 1 顆星星", () => {
  assert.deepEqual(
    DAILY_MISSIONS.map(({ id, xp }) => ({ id, xp })),
    [
      { id: "practice-5", xp: 50 },
      { id: "read-lesson", xp: 25 },
      { id: "fix-wrong", xp: 25 },
    ]
  );
});

test("每日任務仍累加星星，但使用者訊息與任務說明不顯示星星", () => {
  const rewards = defaultRewards();
  const result = applyPracticeSessionReward(rewards, { allCorrect: true }, rewards.daily.date);
  assert.equal(rewards.stars, 1);
  assert.doesNotMatch(result.message, /星星|🌟|⭐/);
  for (const mission of DAILY_MISSIONS) {
    assert.doesNotMatch(mission.description, /星星|🌟|⭐/);
  }
});

test("同一天完成全部三項每日任務共得 100 XP，剛好升一級", () => {
  const rewards = defaultRewards();
  const date = rewards.daily.date;
  for (let i = 0; i < 10; i += 1) {
    applyAnswerReward(rewards, {
      unitId: "fraction-multiply",
      questionId: `all-missions-${i}`,
      isCorrect: true,
    });
  }
  applyPracticeSessionReward(rewards, { allCorrect: true }, date);
  applyLessonReward(rewards, "fraction-multiply", date);

  assert.equal(rewards.xp, 100);
  assert.equal(rewards.stars, 3);
  assert.equal(rewards.daily.completedMissionIds.length, 3);
  assert.equal(getLevelInfo(rewards.xp).level, 2);
});

test("等級獎品：里程碑金額依規則計算（10~40及60~90為100元，50與100為500元）", () => {
  assert.equal(getMilestoneAmount(10), 100);
  assert.equal(getMilestoneAmount(40), 100);
  assert.equal(getMilestoneAmount(50), 500);
  assert.equal(getMilestoneAmount(60), 100);
  assert.equal(getMilestoneAmount(90), 100);
  assert.equal(getMilestoneAmount(100), 500);
});

test("getLevelRewardsSummary：等級未達門檻時全部里程碑皆未解鎖", () => {
  const rewards = defaultRewards();
  rewards.xp = 0;
  const summary = getLevelRewardsSummary(rewards);
  assert.equal(summary.milestones.every((m) => !m.unlocked), true);
  assert.equal(summary.totalUnlockedAmount, 0);
  assert.equal(summary.maxMilestoneNote, "目前最高獎勵里程碑為 100 級");
});

test("getLevelRewardsSummary：剛好達到 10 級時解鎖第一個里程碑，20 級尚未解鎖", () => {
  const rewards = defaultRewards();
  rewards.xp = 9 * 100; // level 10
  const summary = getLevelRewardsSummary(rewards);
  assert.equal(summary.milestones.find((m) => m.level === 10).unlocked, true);
  assert.equal(summary.milestones.find((m) => m.level === 20).unlocked, false);
});

test("getLevelRewardsSummary：超過 100 級時所有里程碑皆解鎖，且提示已達最高里程碑", () => {
  const rewards = defaultRewards();
  rewards.xp = 200 * 100;
  const summary = getLevelRewardsSummary(rewards);
  assert.equal(summary.milestones.every((m) => m.unlocked), true);
  assert.equal(summary.maxMilestoneLevel, 100);
  assert.equal(
    summary.totalUnlockedAmount,
    100 * 4 + 500 + 100 * 4 + 500 // 10~40、60~90 各 100 元，50、100 各 500 元
  );
});

test("getLevelRewardsSummary：舊資料沒有 levelRewards 欄位時可自動補齊，不會噴錯", () => {
  const rewards = defaultRewards();
  delete rewards.levelRewards;
  rewards.xp = 0;
  const summary = getLevelRewardsSummary(rewards);
  assert.equal(summary.milestones.length, 10);
  assert.equal(summary.milestones.every((m) => !m.confirmed), true);
});

test("confirmLevelRewardMilestone：已解鎖且尚未確認時可成功確認領取", () => {
  const rewards = defaultRewards();
  rewards.xp = 9 * 100; // level 10
  const result = confirmLevelRewardMilestone(rewards, 10);
  assert.equal(result.ok, true);
  assert.deepEqual(rewards.levelRewards.confirmedMilestones, [10]);
});

test("confirmLevelRewardMilestone：尚未解鎖時無法確認領取", () => {
  const rewards = defaultRewards();
  rewards.xp = 0;
  const result = confirmLevelRewardMilestone(rewards, 10);
  assert.equal(result.ok, false);
  assert.deepEqual(rewards.levelRewards.confirmedMilestones, []);
});

test("confirmLevelRewardMilestone：同一里程碑不能重複確認領取", () => {
  const rewards = defaultRewards();
  rewards.xp = 9 * 100; // level 10
  confirmLevelRewardMilestone(rewards, 10);
  const second = confirmLevelRewardMilestone(rewards, 10);
  assert.equal(second.ok, false);
  assert.equal(rewards.levelRewards.confirmedMilestones.length, 1);
});

test("達成新等級里程碑時鼓勵訊息只出現一次，不會重複提示", () => {
  const rewards = defaultRewards();
  rewards.xp = 9 * 100 - 25; // 差 25 XP 就達到 10 級
  const first = applyAnswerReward(rewards, {
    unitId: "fraction-multiply",
    questionId: "q-milestone-1",
    isCorrect: true,
    fixedWrong: true,
  });
  assert.ok(first.message.includes("恭喜達到 Lv.10"));
  const second = applyAnswerReward(rewards, {
    unitId: "fraction-multiply",
    questionId: "q-milestone-2",
    isCorrect: true,
    fixedWrong: false,
  });
  assert.equal(second.message.includes("恭喜達到 Lv.10"), false);
});
