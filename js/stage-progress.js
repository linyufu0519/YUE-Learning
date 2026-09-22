import {
  COURSE_ID,
  COURSE_STAGES,
  COURSE_UNITS,
  STAGE_ACTION_XP,
  getStageById,
} from "./course-stages.js";

export const STAGE_ACTIONS = ["lesson", "practice", "mastery"];
export const SEMESTER_XP_CAP = 9900;

export function defaultSemesterProgress() {
  return {
    courseId: COURSE_ID,
    completedActions: {},
    claimedUnitRewards: [],
    stageStats: {},
  };
}

function normalizeStageStats(stats = {}) {
  const result = {};
  for (const [stageId, value] of Object.entries(stats || {})) {
    if (!getStageById(stageId)) continue;
    result[stageId] = {
      attempts: Math.max(0, Number(value?.attempts) || 0),
      correct: Math.max(0, Number(value?.correct) || 0),
      completedQuestionIds: Array.from(new Set(value?.completedQuestionIds || [])),
      recentQuestionIds: Array.from(new Set(value?.recentQuestionIds || [])).slice(0, 20),
    };
  }
  return result;
}

export function normalizeSemesterProgress(progress = {}) {
  const completedActions = {};
  for (const [stageId, actions] of Object.entries(progress?.completedActions || {})) {
    if (!getStageById(stageId)) continue;
    const valid = Array.from(new Set(actions || [])).filter((action) => STAGE_ACTIONS.includes(action));
    if (valid.length) completedActions[stageId] = valid;
  }
  return {
    courseId: COURSE_ID,
    completedActions,
    claimedUnitRewards: Array.from(new Set(progress?.claimedUnitRewards || [])).filter((unitId) =>
      COURSE_UNITS.some((unit) => unit.id === unitId)
    ),
    stageStats: normalizeStageStats(progress?.stageStats),
  };
}

export function isStageComplete(progress, stageId) {
  const actions = new Set(progress?.completedActions?.[stageId] || []);
  return STAGE_ACTIONS.every((action) => actions.has(action));
}

export function getCompletedStageCount(progress) {
  return COURSE_STAGES.filter((stage) => isStageComplete(progress, stage.id)).length;
}

export function isStageUnlocked(progress, stageId) {
  const index = COURSE_STAGES.findIndex((stage) => stage.id === stageId);
  if (index < 0) return false;
  return index === 0 || isStageComplete(progress, COURSE_STAGES[index - 1].id);
}

export function getStageStatus(progress, stageId) {
  if (isStageComplete(progress, stageId)) return "completed";
  if (!isStageUnlocked(progress, stageId)) return "locked";
  return (progress?.completedActions?.[stageId] || []).length ? "in-progress" : "available";
}

export function getCurrentStage(progress) {
  return COURSE_STAGES.find((stage) => isStageUnlocked(progress, stage.id) && !isStageComplete(progress, stage.id)) || null;
}

export function calculateSemesterXp(progress) {
  const normalized = normalizeSemesterProgress(progress);
  const actionXp = Object.values(normalized.completedActions).reduce(
    (sum, actions) =>
      sum + actions.reduce((actionSum, action) => actionSum + (STAGE_ACTION_XP[action] || 0), 0),
    0
  );
  const bonusXp = normalized.claimedUnitRewards.reduce((sum, unitId) => {
    const unit = COURSE_UNITS.find((item) => item.id === unitId);
    return sum + (unit?.completionXp || 0);
  }, 0);
  return Math.min(SEMESTER_XP_CAP, actionXp + bonusXp);
}

function claimCompletedUnits(progress) {
  const claimed = new Set(progress.claimedUnitRewards);
  for (const unit of COURSE_UNITS) {
    const stages = COURSE_STAGES.filter((stage) => stage.unitId === unit.id);
    if (stages.length && stages.every((stage) => isStageComplete(progress, stage.id))) {
      claimed.add(unit.id);
    }
  }
  progress.claimedUnitRewards = Array.from(claimed);
}

export function completeStageAction(progress, stageId, action) {
  const normalized = normalizeSemesterProgress(progress);
  if (!getStageById(stageId) || !STAGE_ACTIONS.includes(action)) {
    return { progress: normalized, awardedXp: 0, unitBonusXp: 0, changed: false };
  }
  if (!isStageUnlocked(normalized, stageId) && !(normalized.completedActions[stageId] || []).length) {
    return { progress: normalized, awardedXp: 0, unitBonusXp: 0, changed: false };
  }
  const beforeXp = calculateSemesterXp(normalized);
  const actions = new Set(normalized.completedActions[stageId] || []);
  const changed = !actions.has(action);
  actions.add(action);
  normalized.completedActions[stageId] = Array.from(actions);
  const beforeUnits = new Set(normalized.claimedUnitRewards);
  claimCompletedUnits(normalized);
  const unitBonusXp = normalized.claimedUnitRewards
    .filter((unitId) => !beforeUnits.has(unitId))
    .reduce((sum, unitId) => sum + (COURSE_UNITS.find((unit) => unit.id === unitId)?.completionXp || 0), 0);
  const afterXp = calculateSemesterXp(normalized);
  return {
    progress: normalized,
    awardedXp: Math.max(0, afterXp - beforeXp),
    unitBonusXp,
    changed,
  };
}

export function recordStageAnswer(progress, { stageId, questionId, isCorrect }) {
  const normalized = normalizeSemesterProgress(progress);
  if (!getStageById(stageId)) return normalized;
  const stats = normalized.stageStats[stageId] || {
    attempts: 0,
    correct: 0,
    completedQuestionIds: [],
    recentQuestionIds: [],
  };
  stats.attempts += 1;
  if (isCorrect) stats.correct += 1;
  stats.completedQuestionIds = Array.from(new Set([...stats.completedQuestionIds, questionId]));
  stats.recentQuestionIds = [questionId, ...stats.recentQuestionIds.filter((id) => id !== questionId)].slice(0, 20);
  normalized.stageStats[stageId] = stats;
  return normalized;
}

export function getSemesterSummary(progress) {
  const normalized = normalizeSemesterProgress(progress);
  const xp = calculateSemesterXp(normalized);
  return {
    xp,
    completedStages: getCompletedStageCount(normalized),
    totalStages: COURSE_STAGES.length,
    currentStage: getCurrentStage(normalized),
    units: COURSE_UNITS.map((unit) => {
      const stages = COURSE_STAGES.filter((stage) => stage.unitId === unit.id);
      const completed = stages.filter((stage) => isStageComplete(normalized, stage.id)).length;
      return {
        ...unit,
        completedStages: completed,
        totalStages: stages.length,
        rewardClaimed: normalized.claimedUnitRewards.includes(unit.id),
      };
    }),
  };
}

export function mergeSemesterProgress(localProgress, cloudProgress) {
  const a = normalizeSemesterProgress(localProgress);
  const b = normalizeSemesterProgress(cloudProgress);
  const completedActions = {};
  for (const stage of COURSE_STAGES) {
    const actions = Array.from(
      new Set([...(a.completedActions[stage.id] || []), ...(b.completedActions[stage.id] || [])])
    );
    if (actions.length) completedActions[stage.id] = actions;
  }
  const stageStats = {};
  for (const stage of COURSE_STAGES) {
    const x = a.stageStats[stage.id];
    const y = b.stageStats[stage.id];
    if (!x && !y) continue;
    stageStats[stage.id] = {
      attempts: Math.max(x?.attempts || 0, y?.attempts || 0),
      correct: Math.max(x?.correct || 0, y?.correct || 0),
      completedQuestionIds: Array.from(
        new Set([...(x?.completedQuestionIds || []), ...(y?.completedQuestionIds || [])])
      ),
      recentQuestionIds: Array.from(
        new Set([...(x?.recentQuestionIds || []), ...(y?.recentQuestionIds || [])])
      ).slice(0, 20),
    };
  }
  const merged = normalizeSemesterProgress({
    completedActions,
    claimedUnitRewards: Array.from(
      new Set([...(a.claimedUnitRewards || []), ...(b.claimedUnitRewards || [])])
    ),
    stageStats,
  });
  claimCompletedUnits(merged);
  return merged;
}
