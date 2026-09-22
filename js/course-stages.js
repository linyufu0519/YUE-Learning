// 康軒六上闖關課程的純資料模型；不讀寫瀏覽器或儲存狀態。
export const COURSE_VERSION = "kangxuan";
export const COURSE_SEMESTER = "grade6-1";
export const COURSE_ID = `${COURSE_VERSION}-${COURSE_SEMESTER}`;
export const STAGE_XP = 100;
export const STAGE_ACTION_XP = Object.freeze({ lesson: 25, practice: 50, mastery: 25 });

const UNIT_DEFINITIONS = [
  ["kx-unit1", "第1單元 最大公因數與最小公倍數", 8, 200, "gcd-lcm", ["質數與合數", "質因數分解", "公因數", "最大公因數", "公倍數", "最小公倍數", "短除法", "生活應用"]],
  ["kx-unit2", "第2單元 分數除法", 9, 200, "fraction-division", ["倒數", "整數除以分數", "分數除以整數", "同分母分數除法", "異分母分數除法", "帶分數除法", "商的意義", "單位量", "生活應用"]],
  ["kx-unit3", "第3單元 數量關係", 7, 200, "quantity-relations", ["數列規律", "圖形規律", "和不變", "差不變", "積不變", "商不變", "間隔問題"]],
  ["kx-unit4", "第4單元 小數除法", 8, 200, "decimal-division", ["整數除以小數", "小數除以整數", "小數除以小數", "商的小數點", "估算", "除法關係", "平均分配", "生活應用"]],
  ["kx-unit5", "第5單元 比與比值", 7, 200, "ratio", ["比的記法", "比值", "相等的比", "最簡整數比", "比的化簡", "連比", "生活應用"]],
  ["kx-review1", "複習（一）", 4, 100, "review-one", ["因數倍數複習", "分數除法複習", "數量關係複習", "小數與比複習"]],
  ["kx-unit6", "第6單元 圓周長與扇形周長", 7, 200, "circle-perimeter", ["圓周率", "直徑與半徑", "圓周長", "扇形弧長", "扇形周長", "反推半徑", "生活應用"]],
  ["kx-unit7", "第7單元 圓面積與扇形面積", 7, 200, "circle-area", ["圓面積", "半徑平方", "扇形面積", "半圓面積", "反推半徑", "組合圖形", "生活應用"]],
  ["kx-unit8", "第8單元 認識速率", 8, 200, "speed", ["速率意義", "距離", "時間", "平均速率", "時速換算", "分速換算", "秒速換算", "生活應用"]],
  ["kx-unit9", "第9單元 放大圖、縮圖與比例尺", 8, 200, "scale", ["放大圖", "縮圖", "比例尺", "圖上距離", "實際距離", "長度換算", "面積變化", "生活應用"]],
  ["kx-review2", "複習（二）", 6, 100, "review-two", ["圓周長複習", "圓面積複習", "速率複習", "單位換算複習", "比例尺複習", "綜合應用"]],
];

export const COURSE_UNITS = Object.freeze(
  UNIT_DEFINITIONS.map(([id, title, stageCount, rewardXp, generatorKey, topics], order) =>
    Object.freeze({
      id,
      title,
      stageCount,
      rewardXp,
      completionXp: rewardXp,
      generatorKey,
      order: order + 1,
      topics: Object.freeze(topics),
    })
  )
);

export const COURSE_STAGES = Object.freeze(
  COURSE_UNITS.flatMap((unit) =>
    unit.topics.map((topic, topicIndex) =>
      Object.freeze({
        id: `${unit.id}-stage-${String(topicIndex + 1).padStart(2, "0")}`,
        version: COURSE_VERSION,
        semester: COURSE_SEMESTER,
        unitId: unit.id,
        unitTitle: unit.title,
        topic,
        order: COURSE_UNITS.slice(0, unit.order - 1).reduce((total, item) => total + item.stageCount, 0) + topicIndex + 1,
        lessonKey: `${COURSE_VERSION}-${COURSE_SEMESTER}-${unit.id}-${topicIndex + 1}`,
        generatorKey: unit.generatorKey,
        xp: STAGE_XP,
      })
    )
  )
);

export const TOTAL_STAGE_XP = COURSE_STAGES.length * STAGE_XP;
export const TOTAL_UNIT_REWARD_XP = COURSE_UNITS.reduce((total, unit) => total + unit.rewardXp, 0);
export const TOTAL_COURSE_XP = TOTAL_STAGE_XP + TOTAL_UNIT_REWARD_XP;

export function getCourseUnits() {
  return COURSE_UNITS;
}

export function getCourseStages() {
  return COURSE_STAGES;
}

export function getCourseUnit(unitId) {
  return COURSE_UNITS.find((unit) => unit.id === unitId);
}

export function getCourseStage(stageId) {
  return COURSE_STAGES.find((stage) => stage.id === stageId);
}

export const getStageById = getCourseStage;

export function getStagesForUnit(unitId) {
  return COURSE_STAGES.filter((stage) => stage.unitId === unitId);
}

export function calculateStageStatuses(completedStageIds = []) {
  const completed = new Set(completedStageIds);
  let foundCurrent = false;
  return COURSE_STAGES.map((stage) => {
    if (completed.has(stage.id)) return { ...stage, status: "completed" };
    if (!foundCurrent) {
      foundCurrent = true;
      return { ...stage, status: "current" };
    }
    return { ...stage, status: "locked" };
  });
}

export function getCurrentStage(completedStageIds = []) {
  return calculateStageStatuses(completedStageIds).find((stage) => stage.status === "current") || null;
}

export function getNextStage(stageId) {
  const stage = getCourseStage(stageId);
  return stage ? COURSE_STAGES[stage.order] || null : null;
}

export function getCourseProgress(completedStageIds = []) {
  const validCompleted = COURSE_STAGES.filter((stage) => completedStageIds.includes(stage.id));
  const currentStage = getCurrentStage(completedStageIds);
  return {
    completedCount: validCompleted.length,
    totalCount: COURSE_STAGES.length,
    completedXp: validCompleted.length * STAGE_XP,
    currentStage,
    nextStage: currentStage ? getNextStage(currentStage.id) : null,
    statuses: calculateStageStatuses(completedStageIds),
  };
}
