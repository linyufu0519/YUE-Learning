// js/storage.js
// localStorage 資料存取層：保存學習紀錄、錯題本與連續學習天數。
import {
  updateStreak,
  calcAccuracy,
  computeUnitProgress,
  mergeWrongBook,
  todayString,
} from "./logic.js";

const STORAGE_KEY = "yue_math_g6_v1";

function defaultState() {
  return {
    streak: { count: 0, lastDate: null },
    units: {}, // unitId -> { attempts, correct, bestAccuracy, lastDate, completedQuestionIds: [] }
    wrongBook: [], // { unitId, questionId, prompt, yourAnswer, correctAnswer, explanation, date }
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed };
  } catch (e) {
    console.warn("讀取學習紀錄失敗，使用預設值。", e);
    return defaultState();
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  return defaultState();
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

  saveState(state);
  return state;
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
