// js/ui-logic.js
// 首頁 UI 狀態計算的純函式（不觸碰 DOM），方便在 Node 測試中驗證：
// 1) 帳號與雲端同步區塊的「精簡卡片／完整表單」收合規則。
// 2) 等級獎品彈出視窗所需的「距離下一個里程碑」計算。
// 實際的 DOM 渲染與事件綁定留在 js/home.js／js/parent.js，這裡只負責決策。

/** 依 Email 產生遮蔽後的顯示文字，例如 ab***@mail.com，避免完整帳號暴露在畫面上。 */
export function maskEmail(email) {
  if (!email || typeof email !== "string" || !email.includes("@")) return "";
  const atIndex = email.indexOf("@");
  const name = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  if (!name) return `@${domain}`;
  const visibleLen = Math.min(2, name.length);
  const visible = name.slice(0, visibleLen);
  const maskedLen = Math.max(name.length - visibleLen, 1);
  return `${visible}${"*".repeat(maskedLen)}@${domain}`;
}

/**
 * 計算「帳號與雲端同步」區塊目前該顯示精簡卡片還是完整表單。
 * - mode 為 error／未登入（offline-no-config、offline、signed-out、initializing）：
 *   一律強制顯示完整表單，不可被誤縮起來，確保使用者一定看得到設定/登入/錯誤訊息。
 * - 已經成功同步過一次（hasSyncedOnce）且目前仍是已登入狀態：預設顯示精簡卡片，
 *   使用者可透過 manualExpanded 手動展開完整表單，也可再手動收合回精簡卡片。
 */
export function computeAccountPanelState({ mode, hasSyncedOnce, manualExpanded }) {
  const signedIn = mode === "synced" || mode === "syncing";
  const collapsible = signedIn && (mode === "synced" || hasSyncedOnce);
  const forceExpand = mode === "error" || !signedIn;
  const showCompact = collapsible && !forceExpand && !manualExpanded;
  return {
    signedIn,
    collapsible,
    showCompact,
    showForm: !showCompact,
    showCollapseButton: collapsible && !forceExpand && manualExpanded,
  };
}

/**
 * 依目前同步狀態更新「是否曾經同步成功」與「使用者是否手動展開」兩個旗標。
 * - 一旦同步成功（synced），標記 hasSyncedOnce = true，讓後續短暫的 syncing 狀態
 *   （例如答題後自動推回雲端）不會讓畫面在精簡卡片與完整表單之間閃爍。
 * - 登出或回到未登入/未設定狀態時，重置兩個旗標，下次登入需重新走一次預設精簡流程。
 * - 發生錯誤時強制 manualExpanded = true，確保完整表單（含錯誤訊息）一定會顯示。
 */
export function nextAccountPanelFlags(status, prev) {
  let hasSyncedOnce = Boolean(prev && prev.hasSyncedOnce);
  let manualExpanded = Boolean(prev && prev.manualExpanded);

  if (status.mode === "synced") {
    hasSyncedOnce = true;
  } else if (
    status.mode === "signed-out" ||
    status.mode === "offline-no-config" ||
    status.mode === "offline"
  ) {
    hasSyncedOnce = false;
    manualExpanded = false;
  }

  if (status.mode === "error") {
    manualExpanded = true;
  }

  return { hasSyncedOnce, manualExpanded };
}

/**
 * 找出「目前等級」距離下一個尚未解鎖的等級獎品里程碑還差幾級。
 * 若所有里程碑都已解鎖（含超過 100 級上限），回傳 null。
 */
export function getNextMilestoneGap(currentLevel, milestones) {
  if (!Array.isArray(milestones) || milestones.length === 0) return null;
  const next = milestones.find((m) => !m.unlocked);
  if (!next) return null;
  return {
    level: next.level,
    amount: next.amount,
    levelsRemaining: Math.max(next.level - currentLevel, 0),
  };
}
