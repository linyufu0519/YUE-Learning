// js/cloud-sync.js
// 瀏覽器端 Firebase 串接層（Auth + Firestore，Web modular SDK 走官方 CDN）。
// 這個檔案「只」負責跟 Firebase 溝通，不含任何合併規則或 UI 邏輯，
// 合併規則在 js/sync-logic.js（純函式、可在 Node 測試），
// 協調流程在 js/sync-manager.js。
//
// 未設定 js/firebase-config.js（或內容仍是佔位字串）時，getCloudAvailability()
// 會回傳 configured:false，呼叫端應優雅回退為離線模式，不應該讓例外往外丟。
//
// 若這裡使用的 SDK 版本號未來已經過舊，請至 https://firebase.google.com/docs/web/setup
// 確認最新的 CDN 網址並更新下方常數即可，不需要改動其他檔案。
import { isFirebaseConfigured } from "./firebase-config-status.js";

const SDK_VERSION = "10.12.2";
const FIREBASE_APP_URL = `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`;
const FIREBASE_AUTH_URL = `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`;
const FIREBASE_FIRESTORE_URL = `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore.js`;

let cachedConfig; // undefined = 尚未嘗試讀取；null = 讀取失敗或不存在
let app = null;
let auth = null;
let db = null;
let authModule = null;
let firestoreModule = null;

async function loadConfig() {
  if (cachedConfig !== undefined) return cachedConfig;
  try {
    // js/firebase-config.js 已列入 .gitignore；若部署站台上不存在此檔，
    // 動態 import 會因為 404 而 reject，這裡一律 catch 起來當作「未設定」。
    const module = await import("./firebase-config.js");
    cachedConfig = module.firebaseConfig || null;
  } catch (error) {
    cachedConfig = null;
  }
  return cachedConfig;
}

export async function getCloudAvailability() {
  const config = await loadConfig();
  return { configured: isFirebaseConfigured(config), config };
}

async function loadFirebaseSdk() {
  const [{ initializeApp }, authMod, firestoreMod] = await Promise.all([
    import(/* webpackIgnore: true */ FIREBASE_APP_URL),
    import(/* webpackIgnore: true */ FIREBASE_AUTH_URL),
    import(/* webpackIgnore: true */ FIREBASE_FIRESTORE_URL),
  ]);
  return { initializeApp, authMod, firestoreMod };
}

/**
 * 初始化雲端同步。若尚未設定 Firebase，回傳 { enabled:false } 且不會發出任何網路請求
 * （不會嘗試載入 Firebase SDK CDN），確保離線模式完全不依賴網路。
 */
export async function initCloud() {
  const { configured, config } = await getCloudAvailability();
  if (!configured) return { enabled: false };

  const { initializeApp, authMod, firestoreMod } = await loadFirebaseSdk();
  authModule = authMod;
  firestoreModule = firestoreMod;
  app = initializeApp(config);
  auth = authModule.getAuth(app);
  db = firestoreModule.getFirestore(app);
  return { enabled: true };
}

export function subscribeAuthState(callback) {
  if (!auth || !authModule) return () => {};
  return authModule.onAuthStateChanged(auth, callback);
}

export async function signUpWithEmail(email, password) {
  if (!auth) throw new Error("雲端同步尚未啟用");
  return authModule.createUserWithEmailAndPassword(auth, email, password);
}

export async function signInWithEmail(email, password) {
  if (!auth) throw new Error("雲端同步尚未啟用");
  return authModule.signInWithEmailAndPassword(auth, email, password);
}

export async function signOutCloud() {
  if (!auth) return;
  return authModule.signOut(auth);
}

function userStateDocRef(uid) {
  return firestoreModule.doc(db, "users", uid, "learning", "state");
}

export async function fetchCloudState(uid) {
  const snap = await firestoreModule.getDoc(userStateDocRef(uid));
  return snap.exists() ? snap.data() : null;
}

/**
 * 在 Firestore transaction 中讀取最新雲端狀態、合併後再寫入。
 * transaction 發生並行寫入時會自動重試，避免不同頁面或裝置整份互相覆蓋。
 */
export async function mergeAndPushCloudState(uid, mergePayload) {
  if (typeof mergePayload !== "function") throw new TypeError("mergePayload 必須是函式");
  const ref = userStateDocRef(uid);
  await firestoreModule.runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    const remote = snap.exists() ? snap.data() : null;
    transaction.set(ref, mergePayload(remote));
  });
}
