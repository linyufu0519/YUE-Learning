// js/rewards.js
// 每日任務與獎勵系統，資料由 storage.js 寫入 localStorage。
import { todayString } from "./logic.js";

export const DAILY_MISSIONS = [
  {
    id: "practice-5",
    title: "完成 5 題練習",
    description: "今天完成任一單元 5 題練習。",
    target: 5,
    xp: 30,
  },
  {
    id: "read-lesson",
    title: "閱讀 1 個教學",
    description: "先學習再練習，觀念更穩。",
    target: 1,
    xp: 20,
  },
  {
    id: "fix-wrong",
    title: "修正 1 題錯題",
    description: "把錯題重新答對，就是最棒的進步。",
    target: 1,
    xp: 25,
  },
];

export function defaultRewards() {
  return {
    xp: 0,
    stars: 0,
    badges: [],
    lessonReads: {}, // unitId -> YYYY-MM-DD[]
    recentQuestionIds: {}, // unitId -> questionId[]
    daily: createDailyProgress(todayString()),
  };
}

export function createDailyProgress(date) {
  return {
    date,
    practiceCount: 0,
    lessonReadCount: 0,
    wrongFixedCount: 0,
    completedMissionIds: [],
  };
}

export function normalizeRewards(rewards = {}) {
  const merged = { ...defaultRewards(), ...rewards };
  merged.badges = Array.isArray(merged.badges) ? merged.badges : [];
  merged.lessonReads = merged.lessonReads || {};
  merged.recentQuestionIds = merged.recentQuestionIds || {};
  merged.daily = normalizeDaily(merged.daily);
  return merged;
}

export function normalizeDaily(daily = {}, date = todayString()) {
  if (!daily || daily.date !== date) return createDailyProgress(date);
  return {
    ...createDailyProgress(date),
    ...daily,
    completedMissionIds: Array.isArray(daily.completedMissionIds)
      ? daily.completedMissionIds
      : [],
  };
}

export function getLevelInfo(xp = 0) {
  const level = Math.floor(xp / 120) + 1;
  const currentLevelXp = (level - 1) * 120;
  const nextLevelXp = level * 120;
  const title =
    level >= 8 ? "數學小博士" : level >= 5 ? "解題高手" : level >= 3 ? "分數探險家" : "學習新星";
  return {
    level,
    title,
    currentLevelXp,
    nextLevelXp,
    progress: Math.min(100, Math.round(((xp - currentLevelXp) / 120) * 100)),
  };
}

export function evaluateMissions(rewards) {
  const daily = normalizeDaily(rewards.daily);
  return DAILY_MISSIONS.map((mission) => {
    const value =
      mission.id === "practice-5"
        ? daily.practiceCount
        : mission.id === "read-lesson"
          ? daily.lessonReadCount
          : daily.wrongFixedCount;
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

export function recordRecentQuestion(rewards, unitId, questionId, max = 12) {
  const ids = rewards.recentQuestionIds[unitId] || [];
  rewards.recentQuestionIds[unitId] = [questionId, ...ids.filter((id) => id !== questionId)].slice(0, max);
}

export function applyAnswerReward(rewards, { unitId, questionId, isCorrect, fixedWrong = false }) {
  rewards.daily = normalizeDaily(rewards.daily);
  rewards.daily.practiceCount += 1;
  rewards.xp += isCorrect ? 10 : 3;
  if (fixedWrong) {
    rewards.daily.wrongFixedCount += 1;
    rewards.xp += 12;
  }
  recordRecentQuestion(rewards, unitId, questionId);
  const missions = completeMissions(rewards);
  grantBadges(rewards);
  return {
    rewards,
    message: buildEncouragement({ isCorrect, fixedWrong, missions }),
  };
}

export function applyLessonReward(rewards, unitId, date = todayString()) {
  rewards.daily = normalizeDaily(rewards.daily, date);
  const reads = rewards.lessonReads[unitId] || [];
  const firstReadToday = !reads.includes(date);
  if (firstReadToday) {
    rewards.lessonReads[unitId] = [...reads, date];
    rewards.daily.lessonReadCount += 1;
    rewards.xp += 15;
  }
  const missions = completeMissions(rewards);
  grantBadges(rewards);
  return {
    rewards,
    firstReadToday,
    message: firstReadToday ? buildLessonMessage(missions) : "今天已經記錄過這個教學囉，複習也很棒！",
  };
}

function buildEncouragement({ isCorrect, fixedWrong, missions }) {
  if (fixedWrong) return "太棒了！你把錯題修正回來了，這就是進步的證明 ⭐";
  if (missions.length) return `任務完成：${missions.map((m) => m.title).join("、")}！獲得星星與 XP 🎉`;
  return isCorrect ? "答對了！穩穩前進，數學力正在升級 🌟" : "沒關係，看看解析再試一次，你會越來越熟 💪";
}

function buildLessonMessage(missions) {
  if (missions.length) return `教學閱讀完成，也完成每日任務！獲得星星與 XP 📖`;
  return "已記錄今天的教學閱讀，先懂觀念再練習最有效！";
}
