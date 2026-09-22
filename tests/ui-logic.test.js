// tests/ui-logic.test.js
import test from "node:test";
import assert from "node:assert/strict";
import {
  maskEmail,
  computeAccountPanelState,
  nextAccountPanelFlags,
  getNextMilestoneGap,
} from "../js/ui-logic.js";

// ---- maskEmail ----
test("maskEmail 遮蔽帳號名稱，只保留前兩碼", () => {
  assert.equal(maskEmail("parent@mail.com"), "pa****@mail.com");
});

test("maskEmail 名稱只有 1 碼時仍安全遮蔽", () => {
  assert.equal(maskEmail("a@mail.com"), "a*@mail.com");
});

test("maskEmail 傳入空值或不含 @ 時回傳空字串", () => {
  assert.equal(maskEmail(""), "");
  assert.equal(maskEmail(null), "");
  assert.equal(maskEmail("not-an-email"), "");
});

// ---- computeAccountPanelState ----
test("computeAccountPanelState：已同步且未手動展開時顯示精簡卡片", () => {
  const panel = computeAccountPanelState({ mode: "synced", hasSyncedOnce: true, manualExpanded: false });
  assert.equal(panel.showCompact, true);
  assert.equal(panel.showForm, false);
  assert.equal(panel.signedIn, true);
});

test("computeAccountPanelState：已同步但使用者手動展開時顯示完整表單", () => {
  const panel = computeAccountPanelState({ mode: "synced", hasSyncedOnce: true, manualExpanded: true });
  assert.equal(panel.showCompact, false);
  assert.equal(panel.showForm, true);
  assert.equal(panel.showCollapseButton, true);
});

test("computeAccountPanelState：同步錯誤時強制顯示完整表單，不可被誤縮起來", () => {
  const panel = computeAccountPanelState({ mode: "error", hasSyncedOnce: true, manualExpanded: false });
  assert.equal(panel.showCompact, false);
  assert.equal(panel.showForm, true);
});

test("computeAccountPanelState：未設定 Firebase 時顯示完整表單", () => {
  const panel = computeAccountPanelState({ mode: "offline-no-config", hasSyncedOnce: false, manualExpanded: false });
  assert.equal(panel.showCompact, false);
  assert.equal(panel.signedIn, false);
});

test("computeAccountPanelState：未登入（offline／signed-out）時顯示完整表單", () => {
  assert.equal(
    computeAccountPanelState({ mode: "offline", hasSyncedOnce: false, manualExpanded: false }).showCompact,
    false
  );
  assert.equal(
    computeAccountPanelState({ mode: "signed-out", hasSyncedOnce: false, manualExpanded: false }).showCompact,
    false
  );
});

test("computeAccountPanelState：已同步過一次，後續短暫 syncing 仍維持精簡卡片（不閃爍）", () => {
  const panel = computeAccountPanelState({ mode: "syncing", hasSyncedOnce: true, manualExpanded: false });
  assert.equal(panel.showCompact, true);
});

test("computeAccountPanelState：第一次登入尚未同步成功時（syncing 且從未同步過）顯示完整表單", () => {
  const panel = computeAccountPanelState({ mode: "syncing", hasSyncedOnce: false, manualExpanded: false });
  assert.equal(panel.showCompact, false);
});

// ---- nextAccountPanelFlags ----
test("nextAccountPanelFlags：同步成功後標記 hasSyncedOnce = true", () => {
  const next = nextAccountPanelFlags({ mode: "synced" }, { hasSyncedOnce: false, manualExpanded: false });
  assert.equal(next.hasSyncedOnce, true);
});

test("nextAccountPanelFlags：登出後重置 hasSyncedOnce 與 manualExpanded，需回復完整表單", () => {
  const next = nextAccountPanelFlags({ mode: "signed-out" }, { hasSyncedOnce: true, manualExpanded: true });
  assert.equal(next.hasSyncedOnce, false);
  assert.equal(next.manualExpanded, false);
});

test("nextAccountPanelFlags：未設定 Firebase／未登入(offline) 也會重置旗標", () => {
  assert.deepEqual(
    nextAccountPanelFlags({ mode: "offline-no-config" }, { hasSyncedOnce: true, manualExpanded: true }),
    { hasSyncedOnce: false, manualExpanded: false }
  );
  assert.deepEqual(
    nextAccountPanelFlags({ mode: "offline" }, { hasSyncedOnce: true, manualExpanded: true }),
    { hasSyncedOnce: false, manualExpanded: false }
  );
});

test("nextAccountPanelFlags：發生錯誤時強制 manualExpanded = true", () => {
  const next = nextAccountPanelFlags({ mode: "error" }, { hasSyncedOnce: true, manualExpanded: false });
  assert.equal(next.manualExpanded, true);
  assert.equal(next.hasSyncedOnce, true);
});

test("nextAccountPanelFlags：syncing 狀態不改變既有旗標", () => {
  const next = nextAccountPanelFlags({ mode: "syncing" }, { hasSyncedOnce: true, manualExpanded: true });
  assert.deepEqual(next, { hasSyncedOnce: true, manualExpanded: true });
});

// ---- getNextMilestoneGap ----
test("getNextMilestoneGap：找出下一個未解鎖里程碑與差距級數", () => {
  const milestones = [
    { level: 10, amount: 100, unlocked: true },
    { level: 20, amount: 100, unlocked: true },
    { level: 30, amount: 100, unlocked: false },
  ];
  const gap = getNextMilestoneGap(15, milestones);
  assert.deepEqual(gap, { level: 30, amount: 100, levelsRemaining: 15 });
});

test("getNextMilestoneGap：全部解鎖時回傳 null", () => {
  const milestones = [
    { level: 10, amount: 100, unlocked: true },
    { level: 20, amount: 100, unlocked: true },
  ];
  assert.equal(getNextMilestoneGap(25, milestones), null);
});

test("getNextMilestoneGap：空清單或非陣列時安全回傳 null", () => {
  assert.equal(getNextMilestoneGap(10, []), null);
  assert.equal(getNextMilestoneGap(10, null), null);
  assert.equal(getNextMilestoneGap(10, undefined), null);
});
