// js/state-shape.js
// 純函式：學習狀態資料結構的預設值、版本正規化與舊資料遷移邏輯。
// 由 storage.js（本機讀寫）與 sync-logic.js（雲端合併）共用，確保兩邊看到同一套資料形狀，
// 也方便在 Node 環境下用假資料測試，不需要瀏覽器 localStorage。
import { DEFAULT_VERSION, isValidVersion } from "./curriculum.js";
import { normalizeRewards } from "./rewards.js";

export function emptyProgress() {
  return { units: {}, wrongBook: [] };
}

export function defaultLearningState() {
  return {
    version: DEFAULT_VERSION,
    streak: { count: 0, lastDate: null },
    progress: { kangxuan: emptyProgress(), hanlin: emptyProgress() },
    rewards: normalizeRewards(),
  };
}

/**
 * 正規化/遷移任意來源（本機 localStorage 或雲端 Firestore）的狀態物件為目前的資料結構。
 * - 版本偏好（state.version）缺少或不合法時，預設補為 kangxuan。
 * - 進度資料改為 state.progress.{kangxuan|hanlin}.{units, wrongBook}，避免康軒／翰林
 *   同名或不同單元互相污染。
 * - 相容第一、二階段的舊資料結構（units/wrongBook 直接放在最外層）：這些舊資料的單元
 *   id 都是翰林版單元（例如 fraction-multiply、fraction-divide），因此遷移到 hanlin 版本，
 *   不會因為改成預設康軒版而讓舊進度消失——使用者切回翰林版仍可完整看到。
 */
export function normalizeLearningState(raw) {
  const base = defaultLearningState();
  if (!raw || typeof raw !== "object") return base;

  const state = { ...base, ...raw };
  state.version = isValidVersion(state.version) ? state.version : DEFAULT_VERSION;
  state.rewards = normalizeRewards(state.rewards);
  state.streak = state.streak && typeof state.streak === "object" ? state.streak : { count: 0, lastDate: null };

  const progress = { kangxuan: emptyProgress(), hanlin: emptyProgress() };
  if (raw.progress && typeof raw.progress === "object") {
    for (const key of Object.keys(progress)) {
      const src = raw.progress[key];
      if (src) {
        progress[key] = {
          units: src.units && typeof src.units === "object" ? src.units : {},
          wrongBook: Array.isArray(src.wrongBook) ? src.wrongBook : [],
        };
      }
    }
  }

  const looksLegacyFlat =
    !raw.progress && (typeof raw.units === "object" || Array.isArray(raw.wrongBook));
  if (looksLegacyFlat) {
    const legacyUnits = raw.units && typeof raw.units === "object" ? raw.units : {};
    const legacyWrongBook = Array.isArray(raw.wrongBook) ? raw.wrongBook : [];
    if (Object.keys(legacyUnits).length || legacyWrongBook.length) {
      progress.hanlin = {
        units: { ...progress.hanlin.units, ...legacyUnits },
        wrongBook: [...progress.hanlin.wrongBook, ...legacyWrongBook],
      };
    }
  }

  state.progress = progress;
  delete state.units;
  delete state.wrongBook;
  return state;
}
