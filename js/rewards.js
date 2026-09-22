// js/rewards.js
// 每日任務與獎勵系統，資料由 storage.js 寫入 localStorage。
import { todayString } from "./logic.js";

export const DAILY_MISSIONS = [
  {
    id: "practice-5",
    title: "完成 10 題練習",
    description: "今天完成任一單元 10 題練習，可獲得 50 XP＋1 顆星星。",
    target: 10,
    xp: 50,
  },
  {
    id: "read-lesson",
    title: "閱讀 1 個教學",
    description: "完成教學閱讀與全部自我檢查，可獲得 25 XP＋1 顆星星。",
    target: 1,
    xp: 25,
  },
  {
    id: "fix-wrong",
    title: "全部答對或修正錯題",
    description: "今天有一次練習全對，或把錯題重新答對，可獲得 25 XP＋1 顆星星。",
    target: 1,
    xp: 25,
  },
];

// 等級獎品里程碑：每 10 級一個獎品，10~40 級與 60~90 級各為零用錢 100 元，
// 50 級與 100 級（每 5 個里程碑一次的「大獎」）為零用錢 500 元。
export const LEVEL_MILESTONES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
export const MAX_LEVEL_MILESTONE = LEVEL_MILESTONES[LEVEL_MILESTONES.length - 1];

/** 取得某個等級里程碑的獎品金額（新台幣）。 */
export function getMilestoneAmount(level) {
  return level % 50 === 0 ? 500 : 100;
}

function createLevelRewards() {
  return {
    confirmedMilestones: [], // 家長已在家長頁確認實際發放的里程碑等級
    notifiedMilestones: [], // 已經顯示過「達成新里程碑」鼓勵訊息的等級（避免每次都重複提示）
  };
}

function normalizeLevelRewards(levelRewards) {
  const base = createLevelRewards();
  const confirmedMilestones = Array.isArray(levelRewards?.confirmedMilestones)
    ? levelRewards.confirmedMilestones.filter((m) => LEVEL_MILESTONES.includes(m))
    : base.confirmedMilestones;
  const notifiedMilestones = Array.isArray(levelRewards?.notifiedMilestones)
    ? levelRewards.notifiedMilestones.filter((m) => LEVEL_MILESTONES.includes(m))
    : base.notifiedMilestones;
  return {
    confirmedMilestones: Array.from(new Set(confirmedMilestones)),
    notifiedMilestones: Array.from(new Set(notifiedMilestones)),
  };
}

export function defaultRewards() {
  return {
    xp: 0,
    stars: 0,
    badges: [],
    lessonReads: {}, // unitId -> YYYY-MM-DD[]
    recentQuestionIds: {}, // unitId -> questionId[]
    daily: createDailyProgress(todayString()),
    levelRewards: createLevelRewards(),
  };
}

export function createDailyProgress(date) {
  return {
    date,
    practiceCount: 0,
    lessonReadCount: 0,
    wrongFixedCount: 0,
    perfectSessionToday: false, // 今天是否有練習全部答對（用於「全部答對或修正錯題」任務）
    completedMissionIds: [],
  };
}

export function normalizeRewards(rewards = {}) {
  const merged = { ...defaultRewards(), ...rewards };
  merged.badges = Array.isArray(merged.badges) ? merged.badges : [];
  merged.lessonReads = merged.lessonReads || {};
  merged.recentQuestionIds = merged.recentQuestionIds || {};
  merged.daily = normalizeDaily(merged.daily);
  merged.levelRewards = normalizeLevelRewards(merged.levelRewards);
  return merged;
}

export function normalizeDaily(daily = {}, date = todayString()) {
  if (!daily || daily.date !== date) return createDailyProgress(date);
  return {
    ...createDailyProgress(date),
    ...daily,
    perfectSessionToday: Boolean(daily.perfectSessionToday),
    completedMissionIds: Array.isArray(daily.completedMissionIds)
      ? daily.completedMissionIds
      : [],
  };
}

export const XP_PER_LEVEL = 100;

export function getLevelInfo(xp = 0) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const currentLevelXp = (level - 1) * XP_PER_LEVEL;
  const nextLevelXp = level * XP_PER_LEVEL;
  const title =
    level >= 8 ? "數學小博士" : level >= 5 ? "解題高手" : level >= 3 ? "分數探險家" : "學習新星";
  return {
    level,
    title,
    currentLevelXp,
    nextLevelXp,
    progress: Math.min(100, Math.round(((xp - currentLevelXp) / XP_PER_LEVEL) * 100)),
  };
}

export function evaluateMissions(rewards) {
  const dailyDate = rewards.daily?.date || todayString();
  const daily = normalizeDaily(rewards.daily, dailyDate);
  return DAILY_MISSIONS.map((mission) => {
    const value =
      mission.id === "practice-5"
        ? daily.practiceCount
        : mission.id === "read-lesson"
          ? daily.lessonReadCount
          : // fix-wrong：修正錯題「或」有一次練習全部答對，兩者任一達成即可完成
            daily.wrongFixedCount + (daily.perfectSessionToday ? 1 : 0);
    return {
      ...mission,
      value,
      done: daily.completedMissionIds.includes(mission.id) || value >= mission.target,
    };
  });
}

function completeMissions(rewards) {
  const completedBefore = new Set(rewards.daily.completedMissionIds);
  const newlyCompleted = [];
  for (const mission of evaluateMissions(rewards)) {
    if (mission.value >= mission.target && !completedBefore.has(mission.id)) {
      rewards.daily.completedMissionIds.push(mission.id);
      rewards.xp += mission.xp;
      rewards.stars += 1;
      newlyCompleted.push(mission);
    }
  }
  return newlyCompleted;
}

function grantBadges(rewards) {
  const badges = new Set(rewards.badges);
  const before = badges.size;
  if (rewards.xp >= 50) badges.add("第一顆星");
  if (rewards.xp >= 200) badges.add("穩定練習家");
  if (Object.keys(rewards.lessonReads || {}).length >= 3) badges.add("愛閱讀學習者");
  if ((rewards.daily?.completedMissionIds || []).length >= DAILY_MISSIONS.length) {
    badges.add("今日任務全完成");
  }
  rewards.badges = [...badges];
  return rewards.badges.length - before;
}

/**
 * 依目前 XP 對應的等級，計算所有等級獎品里程碑的解鎖／確認狀態，供首頁與家長頁顯示。
 * unlocked：依 XP/等級即時計算，不需要另外儲存。
 * confirmed：家長在家長頁「確認領取」後才會標記，代表零用錢已經實際發放。
 */
export function getLevelRewardsSummary(rewards) {
  const level = getLevelInfo(rewards.xp).level;
  const levelRewards = normalizeLevelRewards(rewards.levelRewards);
  const confirmed = new Set(levelRewards.confirmedMilestones);
  const milestones = LEVEL_MILESTONES.map((milestone) => ({
    level: milestone,
    amount: getMilestoneAmount(milestone),
    unlocked: level >= milestone,
    confirmed: confirmed.has(milestone),
  }));
  return {
    milestones,
    maxMilestoneLevel: MAX_LEVEL_MILESTONE,
    maxMilestoneNote: `目前最高獎勵里程碑為 ${MAX_LEVEL_MILESTONE} 級`,
    totalUnlockedAmount: milestones.filter((m) => m.unlocked).reduce((sum, m) => sum + m.amount, 0),
    totalConfirmedAmount: milestones.filter((m) => m.confirmed).reduce((sum, m) => sum + m.amount, 0),
  };
}

/**
 * 偵測本次 XP 變動是否剛好跨過新的等級獎品里程碑，若有，記錄到 notifiedMilestones
 * 避免下次呼叫重複提示，並回傳「新解鎖」的里程碑等級陣列供組成鼓勵訊息使用。
 */
function checkNewLevelMilestones(rewards) {
  const level = getLevelInfo(rewards.xp).level;
  rewards.levelRewards = normalizeLevelRewards(rewards.levelRewards);
  const notified = new Set(rewards.levelRewards.notifiedMilestones);
  const newly = [];
  for (const milestone of LEVEL_MILESTONES) {
    if (level >= milestone && !notified.has(milestone)) {
      notified.add(milestone);
      newly.push(milestone);
    }
  }
  rewards.levelRewards.notifiedMilestones = [...notified];
  return newly;
}

function buildMilestoneMessage(newMilestones) {
  if (!newMilestones.length) return "";
  return newMilestones
    .map(
      (m) =>
        `🎉 恭喜達到 Lv.${m}！解鎖等級獎品：零用錢 ${getMilestoneAmount(m)} 元，記得跟爸媽說一聲，讓爸媽在家長頁確認領取喔！`
    )
    .join(" ");
}

/**
 * 家長在家長頁確認「實際發放」某個等級獎品里程碑（需先通過家長密碼授權，授權判斷由呼叫端 UI 負責）。
 * 規則：里程碑必須已解鎖（等級達到）且尚未確認過，否則回傳 ok:false 並附上原因，不會重複發放。
 */
export function confirmLevelRewardMilestone(rewards, level) {
  if (!LEVEL_MILESTONES.includes(level)) {
    return { rewards, ok: false, message: "找不到這個等級獎品里程碑。" };
  }
  const currentLevel = getLevelInfo(rewards.xp).level;
  if (currentLevel < level) {
    return { rewards, ok: false, message: "還沒有達到這個等級，暫時無法確認領取。" };
  }
  rewards.levelRewards = normalizeLevelRewards(rewards.levelRewards);
  if (rewards.levelRewards.confirmedMilestones.includes(level)) {
    return { rewards, ok: false, message: "這個獎品已經確認領取過了。" };
  }
  rewards.levelRewards.confirmedMilestones = [...rewards.levelRewards.confirmedMilestones, level];
  return {
    rewards,
    ok: true,
    message: `已確認領取 Lv.${level} 獎品：零用錢 ${getMilestoneAmount(level)} 元！`,
  };
}

export function recordRecentQuestion(rewards, unitId, questionId, max = 12) {
  const ids = rewards.recentQuestionIds[unitId] || [];
  rewards.recentQuestionIds[unitId] = [questionId, ...ids.filter((id) => id !== questionId)].slice(0, max);
}

export function applyAnswerReward(rewards, { unitId, questionId, isCorrect, fixedWrong = false }) {
  rewards.daily = normalizeDaily(rewards.daily);
  rewards.daily.practiceCount += 1;
  if (fixedWrong) {
    rewards.daily.wrongFixedCount += 1;
  }
  recordRecentQuestion(rewards, unitId, questionId);
  const missions = completeMissions(rewards);
  grantBadges(rewards);
  const newMilestones = checkNewLevelMilestones(rewards);
  const baseMessage = buildEncouragement({ isCorrect, fixedWrong, missions });
  return {
    rewards,
    message: [baseMessage, buildMilestoneMessage(newMilestones)].filter(Boolean).join(" "),
  };
}

/** 判斷某單元的教學閱讀是否曾經完成過（不限今天），用於重新載入頁面時顯示「已完成」狀態。 */
export function hasReadLessonBefore(rewards, unitId) {
  const reads = rewards?.lessonReads?.[unitId];
  return Array.isArray(reads) && reads.length > 0;
}

/**
 * 一次練習（一個完整 session）結束時呼叫，記錄本次是否全部答對。
 * 用於「全部答對或修正錯題」每日任務：只要今天曾經有一次練習全對，就算完成，
 * 與既有的「修正錯題」路徑二選一即可，不會重複發獎（completeMissions 已用
 * completedMissionIds 防止同一天重複給獎）。
 * @param {object} rewards
 * @param {{allCorrect:boolean}} payload
 */
export function applyPracticeSessionReward(rewards, { allCorrect }, date = todayString()) {
  rewards.daily = normalizeDaily(rewards.daily, date);
  if (allCorrect) {
    rewards.daily.perfectSessionToday = true;
  }
  const missions = completeMissions(rewards);
  grantBadges(rewards);
  const newMilestones = checkNewLevelMilestones(rewards);
  const sessionMsg = missions.length ? buildSessionMissionMessage(missions) : "";
  return {
    rewards,
    message: [sessionMsg, buildMilestoneMessage(newMilestones)].filter(Boolean).join(" "),
  };
}

export function applyLessonReward(rewards, unitId, date = todayString()) {
  rewards.daily = normalizeDaily(rewards.daily, date);
  const reads = rewards.lessonReads[unitId] || [];
  const firstReadToday = !reads.includes(date);
  if (firstReadToday) {
    rewards.lessonReads[unitId] = [...reads, date];
    rewards.daily.lessonReadCount += 1;
  }
  const missions = completeMissions(rewards);
  grantBadges(rewards);
  const newMilestones = checkNewLevelMilestones(rewards);
  const baseMessage = firstReadToday ? buildLessonMessage(missions) : "今天已經記錄過這個教學囉，複習也很棒！";
  return {
    rewards,
    firstReadToday,
    message: [baseMessage, buildMilestoneMessage(newMilestones)].filter(Boolean).join(" "),
  };
}

function buildEncouragement({ isCorrect, fixedWrong, missions }) {
  if (missions.length) return buildMissionRewardMessage(missions);
  if (fixedWrong) return "太棒了！你把錯題修正回來了，這就是進步的證明 🙌";
  return isCorrect ? "答對了！穩穩前進，數學力正在升級 ✨" : "沒關係，看看解析再試一次，你會越來越熟 💪";
}

function buildLessonMessage(missions) {
  if (missions.length) return `教學閱讀完成！${buildMissionRewardMessage(missions)}`;
  return "已記錄今天的教學閱讀，先懂觀念再練習最有效！";
}

function buildSessionMissionMessage(missions) {
  return `太厲害了，這次全部答對！${buildMissionRewardMessage(missions)}`;
}

function buildMissionRewardMessage(missions) {
  const xp = missions.reduce((sum, mission) => sum + mission.xp, 0);
  return `任務完成：${missions.map((m) => m.title).join("、")}！獲得 ${xp} XP 與 ${missions.length} 顆星星 🎉`;
}
