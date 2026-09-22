import test from "node:test";
import assert from "node:assert/strict";
import {
  COURSE_STAGES,
  COURSE_UNITS,
  COURSE_SEMESTER,
  COURSE_VERSION,
  TOTAL_COURSE_XP,
  TOTAL_STAGE_XP,
  TOTAL_UNIT_REWARD_XP,
  calculateStageStatuses,
  getCourseProgress,
  getCurrentStage,
  getNextStage,
  getStagesForUnit,
} from "../js/course-stages.js";

test("康軒六上課程有 11 大項、79 關，且關卡資料完整", () => {
  assert.equal(COURSE_UNITS.length, 11);
  assert.equal(COURSE_STAGES.length, 79);
  assert.deepEqual(COURSE_UNITS.map((unit) => unit.stageCount), [8, 9, 7, 8, 7, 4, 7, 7, 8, 8, 6]);

  for (const stage of COURSE_STAGES) {
    for (const key of ["id", "version", "semester", "unitId", "unitTitle", "topic", "order", "lessonKey", "generatorKey"]) {
      assert.ok(stage[key], `${stage.id} 缺少 ${key}`);
    }
    assert.equal(stage.version, COURSE_VERSION);
    assert.equal(stage.semester, COURSE_SEMESTER);
  }
  assert.deepEqual(COURSE_STAGES.map((stage) => stage.order), Array.from({ length: 79 }, (_, index) => index + 1));
});

test("每關 100 XP，加上單元獎勵後總計為 9900 XP", () => {
  assert.equal(TOTAL_STAGE_XP, 7900);
  assert.equal(TOTAL_UNIT_REWARD_XP, 2000);
  assert.equal(TOTAL_COURSE_XP, 9900);
  assert.deepEqual(COURSE_UNITS.map((unit) => unit.rewardXp), [200, 200, 200, 200, 200, 100, 200, 200, 200, 200, 100]);
});

test("可依單元查詢關卡，並正確計算目前關、下一關與邊界狀態", () => {
  const firstUnitStages = getStagesForUnit("kx-unit1");
  assert.equal(firstUnitStages.length, 8);
  assert.equal(getCurrentStage([]).id, COURSE_STAGES[0].id);
  assert.equal(getNextStage(COURSE_STAGES[0].id).id, COURSE_STAGES[1].id);
  assert.equal(getNextStage(COURSE_STAGES.at(-1).id), null);

  const statuses = calculateStageStatuses([COURSE_STAGES[0].id]);
  assert.equal(statuses[0].status, "completed");
  assert.equal(statuses[1].status, "current");
  assert.equal(statuses[2].status, "locked");

  const progress = getCourseProgress(COURSE_STAGES.map((stage) => stage.id));
  assert.equal(progress.completedCount, 79);
  assert.equal(progress.completedXp, 7900);
  assert.equal(progress.currentStage, null);
  assert.equal(progress.nextStage, null);
});
