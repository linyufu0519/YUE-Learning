// js/sync-logic.js
// 雲端同步的「純邏輯」層：狀態合併規則、同步 payload 組裝、狀態文字說明、
// 登入/註冊錯誤訊息轉繁體中文。全部都是不接觸 DOM、不接觸 Firebase SDK 的純函式，
// 方便在 Node 環境下用假資料測試，也讓 sync-manager.js（實際串接 Firebase 的地方）
// 保持單薄、只負責「呼叫」這些規則。
import { todayString } from "./logic.js";
import { normalizeRewards, normalizeDaily } from "./rewards.js";

function pickLaterDate(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  return a > b ? a : b;
}

function mergeUnitState(localUnit, cloudUnit) {
  if (!localUnit) return cloudUnit;
  if (!cloudUnit) return localUnit;
  const completedQuestionIds = Array.from(
    new Set([
      ...(localUnit.completedQuestionIds || []),
      ...(cloudUnit.completedQuestionIds || []),
    ])
  );
  return {
    attempts: Math.max(localUnit.attempts || 0, cloudUnit.attempts || 0),
    correct: Math.max(localUnit.correct || 0, cloudUnit.correct || 0),
    bestAccuracy: Math.max(localUnit.bestAccuracy || 0, cloudUnit.bestAccuracy || 0),
    lastDate: pickLaterDate(localUnit.lastDate, cloudUnit.lastDate),
    completedQuestionIds,
  };
}

function mergeUnits(localUnits = {}, cloudUnits = {}) {
  const ids = new Set([...Object.keys(localUnits || {}), ...Object.keys(cloudUnits || {})]);
  const result = {};
  for (const id of ids) {
    result[id] = mergeUnitState(localUnits[id], cloudUnits[id]);
  }
  return result;
}

/** 錯題本合併：同一題（unitId+questionId）只留下日期較新的一筆。 */
export function mergeWrongBooks(localBook = [], cloudBook = []) {
  const map = new Map();
  for (const entry of [...(cloudBook || []), ...(localBook || [])]) {
    const key = `${entry.unitId}::${entry.questionId}`;
    const existing = map.get(key);
    if (!existing || (entry.date || "") >= (existing.date || "")) {
      map.set(key, entry);
    }
  }
  return Array.from(map.values());
}

function mergeStreak(localStreak, cloudStreak) {
  const a = localStreak || { count: 0, lastDate: null };
  const b = cloudStreak || { count: 0, lastDate: null };
  if (!a.lastDate) return b;
  if (!b.lastDate) return a;
  if (a.lastDate === b.lastDate) {
    return (a.count || 0) >= (b.count || 0) ? a : b;
  }
  return a.lastDate > b.lastDate ? a : b;
}

function mergeDaily(localDaily, cloudDaily, today) {
  const a = localDaily && localDaily.date === today ? localDaily : null;
  const b = cloudDaily && cloudDaily.date === today ? cloudDaily : null;
  if (a && b) {
    return {
      date: today,
      practiceCount: Math.max(a.practiceCount || 0, b.practiceCount || 0),
      lessonReadCount: Math.max(a.lessonReadCount || 0, b.lessonReadCount || 0),
      wrongFixedCount: Math.max(a.wrongFixedCount || 0, b.wrongFixedCount || 0),
      completedMissionIds: Array.from(
        new Set([...(a.completedMissionIds || []), ...(b.completedMissionIds || [])])
      ),
    };
  }
  if (a) return a;
  if (b) return b;
  // 兩邊都不是今天的紀錄：保留日期較新的一筆，之後 storage.js 讀取時會依「今天」重新建立每日任務
  const localDate = localDaily && localDaily.date;
  const cloudDate = cloudDaily && cloudDaily.date;
  if (pickLaterDate(localDate, cloudDate) === localDate) return localDaily || cloudDaily;
  return cloudDaily || localDaily;
}

function mergeRewards(localRewards, cloudRewards, today) {
  // 注意：normalizeRewards() 內部會用「真正的今天」正規化 daily 欄位，
  // 若這裡先呼叫 normalizeRewards 再改用測試注入的 today 重新正規化，
  // daily 內容已經被重置為 0，資料就救不回來了。因此要先取出「原始」daily，
  // 再用呼叫端指定的 today 正規化一次。
  const rawLocalDaily = localRewards && localRewards.daily;
  const rawCloudDaily = cloudRewards && cloudRewards.daily;
  const a = normalizeRewards(localRewards);
  const b = normalizeRewards(cloudRewards);
  a.daily = normalizeDaily(rawLocalDaily, today);
  b.daily = normalizeDaily(rawCloudDaily, today);

  const lessonReads = {};
  for (const id of new Set([...Object.keys(a.lessonReads), ...Object.keys(b.lessonReads)])) {
    lessonReads[id] = Array.from(new Set([...(a.lessonReads[id] || []), ...(b.lessonReads[id] || [])]));
  }

  const recentQuestionIds = {};
  for (const id of new Set([...Object.keys(a.recentQuestionIds), ...Object.keys(b.recentQuestionIds)])) {
    recentQuestionIds[id] = Array.from(
      new Set([...(a.recentQuestionIds[id] || []), ...(b.recentQuestionIds[id] || [])])
    ).slice(0, 12);
  }

  return {
    xp: Math.max(a.xp, b.xp),
    stars: Math.max(a.stars, b.stars),
    badges: Array.from(new Set([...a.badges, ...b.badges])),
    lessonReads,
    recentQuestionIds,
    daily: mergeDaily(a.daily, b.daily, today),
  };
}

/**
 * 合併本機（local）與雲端（cloud）學習狀態，用於使用者登入時。
 * 原則：不覆蓋、不遺失，各欄位分別採用「取較大值」「聯集」「取較新日期」等規則。
 * @param {object|null} localState
 * @param {object|null} cloudState
 * @param {string} today YYYY-MM-DD（可注入方便測試）
 */
export function mergeState(localState, cloudState, today = todayString()) {
  if (!cloudState) {
    const rawDaily = localState?.rewards?.daily;
    const rewards = normalizeRewards(localState?.rewards);
    rewards.daily = normalizeDaily(rawDaily, today);
    return {
      streak: localState?.streak || { count: 0, lastDate: null },
      units: localState?.units || {},
      wrongBook: localState?.wrongBook || [],
      rewards,
      updatedAt: new Date().toISOString(),
    };
  }
  if (!localState) {
    const rawDaily = cloudState.rewards?.daily;
    const rewards = normalizeRewards(cloudState.rewards);
    rewards.daily = normalizeDaily(rawDaily, today);
    return {
      streak: cloudState.streak || { count: 0, lastDate: null },
      units: cloudState.units || {},
      wrongBook: cloudState.wrongBook || [],
      rewards,
      updatedAt: new Date().toISOString(),
    };
  }
  return {
    streak: mergeStreak(localState.streak, cloudState.streak),
    units: mergeUnits(localState.units, cloudState.units),
    wrongBook: mergeWrongBooks(localState.wrongBook, cloudState.wrongBook),
    rewards: mergeRewards(localState.rewards, cloudState.rewards, today),
    updatedAt: new Date().toISOString(),
  };
}

/** 組裝要寫入 Firestore 的同步 payload（帶上更新時間戳記）。 */
export function buildCloudPayload(state, updatedAt = new Date().toISOString()) {
  return { ...state, updatedAt };
}

/** 依「Firebase 是否已設定」決定初始同步模式。 */
export function resolveSyncMode(configured) {
  return configured ? "cloud" : "offline-no-config";
}

/** 將同步狀態轉為親子友善的繁體中文說明文字。 */
export function describeSyncStatus(status = {}) {
  const email = status.user?.email || "";
  switch (status.mode) {
    case "offline-no-config":
      return "離線模式，尚未設定雲端同步";
    case "offline":
      return "雲端同步已啟用，尚未登入（目前使用本機離線資料）";
    case "signed-out":
      return "已登出，使用本機離線資料";
    case "syncing":
      return email ? `同步中…（${email}）` : "同步中…";
    case "synced":
      return email ? `雲端同步完成（${email}）` : "雲端同步完成";
    case "error":
      return `同步發生問題，已保留本機資料（${status.error || "未知錯誤"}）`;
    default:
      return "初始化中…";
  }
}

/** 將 Firebase Auth 的錯誤代碼轉為繁體中文友善提示。 */
export function mapAuthError(error) {
  const code = error && error.code;
  switch (code) {
    case "auth/email-already-in-use":
      return "這個 Email 已經註冊過了，請直接登入。";
    case "auth/invalid-email":
      return "Email 格式不正確，請確認後再試一次。";
    case "auth/weak-password":
      return "密碼至少需要 6 碼。";
    case "auth/missing-password":
      return "請輸入密碼。";
    case "auth/user-not-found":
      return "找不到這個帳號，請確認 Email 或先註冊。";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "帳號或密碼不正確，請再試一次。";
    case "auth/too-many-requests":
      return "嘗試次數過多，請稍後再試。";
    case "auth/network-request-failed":
      return "網路連線異常，請確認網路後再試一次。";
    default:
      return (error && error.message) || "發生未知錯誤，請稍後再試。";
  }
}
