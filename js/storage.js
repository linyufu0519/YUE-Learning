// js/storage.js
// localStorage 資料存取層：保存學習紀錄、錯題本、連續學習天數與教材版本偏好。
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
  hasReadLessonBefore,
  normalizeRewards,
} from "./rewards.js";
import { defaultLearningState, normalizeLearningState } from "./state-shape.js";
import { isValidVersion, DEFAULT_VERSION } from "./curriculum.js";

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

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultLearningState();
    const parsed = JSON.parse(raw);
    return normalizeLearningState(parsed);
  } catch (e) {
    console.warn("讀取學習紀錄失敗，使用預設值。", e);
    return defaultLearningState();
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  notifyListeners(state);
}

export function resetState() {
  // 使用 saveState 而非直接刪除 key，確保清除紀錄也會觸發狀態變更通知，
  // 讓已登入雲端同步的裝置把「清空後的狀態」一併同步到 Firestore。
  const state = defaultLearningState();
  saveState(state);
  return state;
}

/**
 * 以雲端合併後的完整狀態覆寫本機紀錄（供 sync-manager.js 於登入合併時使用）。
 * 會補齊缺少欄位、正規化資料結構，避免雲端資料結構較舊時造成錯誤。
 */
export function replaceState(newState) {
  const merged = normalizeLearningState(newState);
  saveState(merged);
  return merged;
}

/** 取得目前使用者選擇的教材版本（預設康軒版）。 */
export function getCurrentVersion() {
  return loadState().version;
}

/** 切換教材版本偏好，並保存、觸發雲端同步。 */
export function setCurrentVersion(version) {
  const state = loadState();
  state.version = isValidVersion(version) ? version : DEFAULT_VERSION;
  saveState(state);
  return state;
}

function getVersionProgress(state, version) {
  const key = isValidVersion(version) ? version : state.version;
  if (!state.progress[key]) {
    state.progress[key] = { units: {}, wrongBook: [] };
  }
  return { key, progress: state.progress[key] };
}

function getUnitState(progress, unitId) {
  if (!progress.units[unitId]) {
    progress.units[unitId] = {
      attempts: 0,
      correct: 0,
      bestAccuracy: 0,
      lastDate: null,
      completedQuestionIds: [],
    };
  }
  return progress.units[unitId];
}

/**
 * 記錄一題作答結果，更新（依版本區分的）單元統計、錯題本，並更新連續學習天數與獎勵。
 * @param {{unitId:string, questionId:string, prompt:string, isCorrect:boolean, yourAnswer:string, correctAnswer:string, explanation:string, version?:string}} payload
 */
export function recordAnswer(payload) {
  const state = loadState();
  const today = todayString();
  const { progress } = getVersionProgress(state, payload.version);
  const unit = getUnitState(progress, payload.unitId);
  const wasWrong = progress.wrongBook.some(
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

  progress.wrongBook = mergeWrongBook(progress.wrongBook, {
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

export function getUnitSummary(unitId, totalQuestions, version) {
  const state = loadState();
  const { progress } = getVersionProgress(state, version);
  const unit = progress.units[unitId];
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

export function getWrongBook(version) {
  const state = loadState();
  return getVersionProgress(state, version).progress.wrongBook;
}

export function getAllUnitStates(version) {
  const state = loadState();
  return getVersionProgress(state, version).progress.units;
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

/** 查詢某單元的教學是否曾經完成過（不限今天），供教學頁重新載入時顯示已完成狀態。 */
export function isLessonCompletedBefore(unitId) {
  const state = loadState();
  return hasReadLessonBefore(state.rewards, unitId);
}

export function getRewardSummary() {
  const rewards = loadState().rewards;
  return {
    ...rewards,
    levelInfo: getLevelInfo(rewards.xp),
    missions: evaluateMissions(rewards),
  };
}
