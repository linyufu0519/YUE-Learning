// js/storage.js
// localStorage 資料存取層：保存學習紀錄、錯題本與連續學習天數。
import {
  updateStreak,
  calcAccuracy,
  computeUnitProgress,
  mergeWrongBook,
  todayString,
} from "./logic.js";
import {
  applyAnswerReward,
  applyLessonReward,
  evaluateMissions,
  getLevelInfo,
  normalizeRewards,
} from "./rewards.js";

const STORAGE_KEY = "yue_math_g6_v1";

// 狀態變更監聽者：讓雲端同步模組（sync-manager.js）可以在不修改 storage.js 內部邏輯的
// 情況下，得知每次答題/教學閱讀/清除紀錄後的最新狀態，決定是否要推送到 Firestore。
// storage.js 本身完全不認識 Firebase，維持單一職責、離線也能正常運作。
let listeners = [];

export function onStateChange(callback) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((cb) => cb !== callback);
  };
}

function notifyListeners(state) {
  for (const cb of listeners) {
    try {
      cb(state);
    } catch (e) {
      console.error("狀態變更通知發生錯誤", e);
    }
  }
}

function defaultState() {
  return {
    streak: { count: 0, lastDate: null },
    units: {}, // unitId -> { attempts, correct, bestAccuracy, lastDate, completedQuestionIds: [] }
    wrongBook: [], // { unitId, questionId, prompt, yourAnswer, correctAnswer, explanation, date }
    rewards: normalizeRewards(),
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const state = { ...defaultState(), ...parsed };
    state.rewards = normalizeRewards(state.rewards);
    state.units = state.units || {};
    state.wrongBook = Array.isArray(state.wrongBook) ? state.wrongBook : [];
    return state;
  } catch (e) {
    console.warn("讀取學習紀錄失敗，使用預設值。", e);
    return defaultState();
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  notifyListeners(state);
}

export function resetState() {
  // 使用 saveState 而非直接刪除 key，確保清除紀錄也會觸發狀態變更通知，
  // 讓已登入雲端同步的裝置把「清空後的狀態」一併同步到 Firestore。
  const state = defaultState();
  saveState(state);
  return state;
}

/**
 * 以雲端合併後的完整狀態覆寫本機紀錄（供 sync-manager.js 於登入合併時使用）。
 * 會補齊缺少欄位、正規化 rewards，避免雲端資料結構較舊時造成錯誤。
 */
export function replaceState(newState) {
  const merged = { ...defaultState(), ...newState };
  merged.rewards = normalizeRewards(merged.rewards);
  merged.units = merged.units || {};
  merged.wrongBook = Array.isArray(merged.wrongBook) ? merged.wrongBook : [];
  saveState(merged);
  return merged;
}

function getUnitState(state, unitId) {
  if (!state.units[unitId]) {
    state.units[unitId] = {
      attempts: 0,
      correct: 0,
      bestAccuracy: 0,
      lastDate: null,
      completedQuestionIds: [],
    };
  }
  return state.units[unitId];
}

/**
 * 記錄一題作答結果，更新單元統計、錯題本與連續學習天數。
 * @param {{unitId:string, questionId:string, prompt:string, isCorrect:boolean, yourAnswer:string, correctAnswer:string, explanation:string}} payload
 */
export function recordAnswer(payload) {
  const state = loadState();
  const today = todayString();
  const unit = getUnitState(state, payload.unitId);
  const wasWrong = state.wrongBook.some(
    (w) => w.unitId === payload.unitId && w.questionId === payload.questionId
  );

  unit.attempts += 1;
  if (payload.isCorrect) unit.correct += 1;
  if (!unit.completedQuestionIds.includes(payload.questionId)) {
    unit.completedQuestionIds.push(payload.questionId);
  }
  unit.lastDate = today;

  const accuracyNow = calcAccuracy(unit.correct, unit.attempts);
  unit.bestAccuracy = Math.max(unit.bestAccuracy, accuracyNow);

  state.wrongBook = mergeWrongBook(state.wrongBook, {
    unitId: payload.unitId,
    questionId: payload.questionId,
    prompt: payload.prompt,
    yourAnswer: payload.yourAnswer,
    correctAnswer: payload.correctAnswer,
    explanation: payload.explanation,
    isCorrect: payload.isCorrect,
    date: today,
  });

  state.streak.count = updateStreak(
    state.streak.lastDate,
    today,
    state.streak.count
  );
  state.streak.lastDate = today;

  const rewardResult = applyAnswerReward(state.rewards, {
    unitId: payload.unitId,
    questionId: payload.questionId,
    isCorrect: payload.isCorrect,
    fixedWrong: wasWrong && payload.isCorrect,
  });
  state.rewards = rewardResult.rewards;

  saveState(state);
  return { ...state, rewardMessage: rewardResult.message };
}

export function getUnitSummary(unitId, totalQuestions) {
  const state = loadState();
  const unit = state.units[unitId];
  if (!unit) {
    return {
      attempts: 0,
      correct: 0,
      accuracy: 0,
      progress: 0,
      lastDate: null,
    };
  }
  return {
    attempts: unit.attempts,
    correct: unit.correct,
    accuracy: calcAccuracy(unit.correct, unit.attempts),
    progress: computeUnitProgress(unit.completedQuestionIds.length, totalQuestions),
    lastDate: unit.lastDate,
  };
}

export function getStreak() {
  return loadState().streak;
}

export function getWrongBook() {
  return loadState().wrongBook;
}

export function getAllUnitStates() {
  return loadState().units;
}

export function getRecentQuestionIds(unitId) {
  const state = loadState();
  return state.rewards.recentQuestionIds[unitId] || [];
}

export function recordLessonRead(unitId) {
  const state = loadState();
  const result = applyLessonReward(state.rewards, unitId);
  state.rewards = result.rewards;
  saveState(state);
  return { ...state, lessonMessage: result.message, firstReadToday: result.firstReadToday };
}

export function getRewardSummary() {
  const rewards = loadState().rewards;
  return {
    ...rewards,
    levelInfo: getLevelInfo(rewards.xp),
    missions: evaluateMissions(rewards),
  };
}
