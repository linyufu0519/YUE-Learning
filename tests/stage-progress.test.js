import test from "node:test";
import assert from "node:assert/strict";
import { COURSE_STAGES, COURSE_UNITS } from "../js/course-stages.js";
import {
  calculateSemesterXp,
  completeStageAction,
  defaultSemesterProgress,
  getCurrentStage,
  getSemesterSummary,
  isStageUnlocked,
  mergeSemesterProgress,
  recordStageAnswer,
} from "../js/stage-progress.js";
import { getLevelInfo } from "../js/rewards.js";
import { normalizeLearningState } from "../js/state-shape.js";
import { mergeState } from "../js/sync-logic.js";

test("舊資料遷移會保留歷史 XP 並新增空白六上進度", () => {
  const state = normalizeLearningState({ rewards: { xp: 987, stars: 12 } });
  assert.equal(state.rewards.xp, 987);
  assert.equal(calculateSemesterXp(state.semesterProgress), 0);
  assert.deepEqual(state.semesterProgress.completedActions, {});
});

test("關卡依序解鎖且三段 XP 不重複", () => {
  const first = COURSE_STAGES[0];
  const second = COURSE_STAGES[1];
  let progress = defaultSemesterProgress();
  assert.equal(isStageUnlocked(progress, first.id), true);
  assert.equal(isStageUnlocked(progress, second.id), false);
  assert.equal(getCurrentStage(progress).id, first.id);

  for (const action of ["lesson", "practice", "mastery"]) {
    const result = completeStageAction(progress, first.id, action);
    progress = result.progress;
  }
  assert.equal(calculateSemesterXp(progress), 100);
  assert.equal(isStageUnlocked(progress, second.id), true);

  const duplicate = completeStageAction(progress, first.id, "practice");
  assert.equal(duplicate.awardedXp, 0);
  assert.equal(calculateSemesterXp(duplicate.progress), 100);
});

test("完成全部關卡自動取得單元獎勵，總額上限9900並達Lv.100", () => {
  let progress = defaultSemesterProgress();
  for (const stage of COURSE_STAGES) {
    for (const action of ["lesson", "practice", "mastery"]) {
      progress = completeStageAction(progress, stage.id, action).progress;
    }
  }
  const summary = getSemesterSummary(progress);
  assert.equal(summary.completedStages, 79);
  assert.equal(progress.claimedUnitRewards.length, COURSE_UNITS.length);
  assert.equal(summary.xp, 9900);
  assert.equal(getLevelInfo(summary.xp).level, 100);
  assert.equal(getLevelInfo(summary.xp).title, "數學大師玥玥");
});

test("作答統計保存關卡來源，修正只完成來源關卡", () => {
  const stage = COURSE_STAGES[0];
  let progress = recordStageAnswer(defaultSemesterProgress(), {
    stageId: stage.id,
    questionId: "q1",
    isCorrect: false,
  });
  progress = recordStageAnswer(progress, {
    stageId: stage.id,
    questionId: "q1",
    isCorrect: true,
  });
  assert.equal(progress.stageStats[stage.id].attempts, 2);
  assert.equal(progress.stageStats[stage.id].correct, 1);
  assert.equal(calculateSemesterXp(progress), 0);
  progress = completeStageAction(progress, stage.id, "mastery").progress;
  assert.equal(calculateSemesterXp(progress), 25);
  assert.equal(progress.completedActions[COURSE_STAGES[1].id], undefined);
});

test("雲端合併採集合聯集且不重複計算 XP", () => {
  const stage = COURSE_STAGES[0];
  const local = completeStageAction(defaultSemesterProgress(), stage.id, "lesson").progress;
  const cloud = completeStageAction(defaultSemesterProgress(), stage.id, "practice").progress;
  const merged = mergeSemesterProgress(local, cloud);
  assert.deepEqual(new Set(merged.completedActions[stage.id]), new Set(["lesson", "practice"]));
  assert.equal(calculateSemesterXp(merged), 75);

  const state = mergeState(
    { semesterProgress: local },
    { semesterProgress: cloud },
    "2026-09-22"
  );
  assert.equal(calculateSemesterXp(state.semesterProgress), 75);
});
