// js/sync-manager.js
// 協調層：串接 js/cloud-sync.js（Firebase I/O）與 js/storage.js（本機資料），
// 並使用 js/sync-logic.js 的純函式決定合併規則。首頁與家長頁都會呼叫 initSync()，
// 由 Firebase Auth 自己的 session 持久化機制，讓不同頁面共享登入狀態。
import { loadState, replaceState, onStateChange } from "./storage.js";
import { mergeState, buildCloudPayload, mapAuthError } from "./sync-logic.js";
import { todayString } from "./logic.js";
import * as cloud from "./cloud-sync.js";

let currentUser = null;
let lastMergedUid = null;
let unsubscribeState = null;
let statusListeners = [];
let currentStatus = { mode: "initializing" };

function setStatus(patch) {
  currentStatus = { ...currentStatus, ...patch };
  for (const cb of statusListeners) {
    try {
      cb(currentStatus);
    } catch (e) {
      console.error(e);
    }
  }
}

export function onSyncStatusChange(callback) {
  statusListeners.push(callback);
  callback(currentStatus);
  return () => {
    statusListeners = statusListeners.filter((cb) => cb !== callback);
  };
}

export function getSyncStatus() {
  return currentStatus;
}

function ensurePushSubscription() {
  if (unsubscribeState) return;
  unsubscribeState = onStateChange(async (state) => {
    if (!currentUser) return;
    try {
      setStatus({ mode: "syncing", user: { email: currentUser.email } });
      await cloud.pushCloudState(currentUser.uid, buildCloudPayload(state));
      setStatus({ mode: "synced", user: { email: currentUser.email }, lastSyncedAt: new Date().toISOString() });
    } catch (error) {
      setStatus({ mode: "error", user: { email: currentUser.email }, error: error.message });
    }
  });
}

/** 啟動雲端同步（頁面載入時呼叫一次）。未設定 Firebase 時安全地退回離線模式。 */
export async function initSync() {
  try {
    const { enabled } = await cloud.initCloud();
    if (!enabled) {
      setStatus({ mode: "offline-no-config", user: null });
      return;
    }
    setStatus({ mode: "offline", user: null });

    cloud.subscribeAuthState(async (user) => {
      currentUser = user;
      if (!user) {
        lastMergedUid = null;
        setStatus({ mode: "signed-out", user: null });
        return;
      }

      ensurePushSubscription();

      if (lastMergedUid === user.uid) {
        setStatus({ mode: "synced", user: { email: user.email }, lastSyncedAt: new Date().toISOString() });
        return;
      }

      setStatus({ mode: "syncing", user: { email: user.email } });
      try {
        const local = loadState();
        const remote = await cloud.fetchCloudState(user.uid);
        const merged = mergeState(local, remote, todayString());
        replaceState(merged); // 觸發 onStateChange -> 自動推回雲端，確保雙邊一致
        lastMergedUid = user.uid;
      } catch (error) {
        setStatus({ mode: "error", user: { email: user.email }, error: error.message });
      }
    });
  } catch (error) {
    // 設定看似完成但 SDK 載入/初始化失敗（例如離線、CDN 無法連線）：
    // 依需求優雅回退為離線模式，不可讓整頁噴錯。
    setStatus({ mode: "offline-no-config", user: null, error: error.message });
  }
}

export async function registerAccount(email, password) {
  try {
    await cloud.signUpWithEmail(email, password);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: mapAuthError(error) };
  }
}

export async function loginAccount(email, password) {
  try {
    await cloud.signInWithEmail(email, password);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: mapAuthError(error) };
  }
}

export async function logoutAccount() {
  await cloud.signOutCloud();
}
