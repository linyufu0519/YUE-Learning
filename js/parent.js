// js/parent.js
import { getUnitsForVersion, isPracticeAvailable, getAvailableQuestionCount, getUnitByVersion, getVersionLabel } from "./curriculum.js";
import {
  getRewardSummary,
  getUnitSummary,
  getStreak,
  getWrongBook,
  getCurrentVersion,
  resetState,
  confirmLevelReward,
} from "./storage.js";
import { verifyParentPassword } from "./parent-auth.js";
import { describeSyncStatus } from "./sync-logic.js";
import { initSync, onSyncStatusChange } from "./sync-manager.js";
import { renderVersionSwitcher } from "./version-ui.js";

let isParentAuthorized = false;

// 版本標示為單純顯示用途（非學習內容），不需要密碼即可顯示，讓家長進入前就知道目前是哪個版本。
document.getElementById("parent-version-subtitle").textContent = `${getVersionLabel(getCurrentVersion())}．國小六年級`;

function render() {
  const version = getCurrentVersion();
  const UNITS = getUnitsForVersion(version);
  document.getElementById("p-version-label").textContent = getVersionLabel(version);
  renderVersionSwitcher("version-switcher-buttons");

  const streak = getStreak();
  const wrongBook = getWrongBook(version);
  const rewards = getRewardSummary();
  let totalAttempts = 0;
  let latestDate = null;

  const tbody = document.getElementById("unit-table-body");
  tbody.innerHTML = "";

  for (const unit of UNITS) {
    const practiceReady = isPracticeAvailable(version, unit.id);
    const summary = getUnitSummary(unit.id, getAvailableQuestionCount(version, unit.id), version);
    totalAttempts += summary.attempts;
    if (summary.lastDate && (!latestDate || summary.lastDate > latestDate)) {
      latestDate = summary.lastDate;
    }

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${unit.icon} ${unit.title}</td>
      <td>${practiceReady ? summary.attempts : "題庫建置中"}</td>
      <td>${practiceReady && summary.attempts > 0 ? `${summary.accuracy}%` : "—"}</td>
      <td>${practiceReady ? `${summary.progress}%` : "教學可用"}</td>
      <td>${summary.lastDate || "尚未開始"}</td>
    `;
    tbody.appendChild(row);
  }

  document.getElementById("p-streak").textContent = streak.count || 0;
  document.getElementById("p-last-date").textContent = latestDate || "—";
  document.getElementById("p-total-attempts").textContent = totalAttempts;
  document.getElementById("p-wrong-count").textContent = wrongBook.length;
  document.getElementById("p-xp").textContent = rewards.xp;
  document.getElementById("p-stars").textContent = rewards.stars;
  document.getElementById("p-title").textContent = rewards.levelInfo.title;
  document.getElementById("p-level").textContent = rewards.levelInfo.level;
  document.getElementById("p-mission-list").innerHTML = rewards.missions
    .map(
      (mission) => `
        <div class="mission-item ${mission.done ? "done" : ""}">
          <div>
            <strong>${mission.done ? "✅" : "⬜"} ${escapeHtml(mission.title)}</strong>
            <div class="unit-meta">${escapeHtml(mission.description)}</div>
          </div>
          <span>${Math.min(mission.value, mission.target)} / ${mission.target}</span>
        </div>
      `
    )
    .join("");
  document.getElementById("p-badge-list").innerHTML = rewards.badges.length
    ? rewards.badges.map((badge) => `<span class="mini-badge">🏅 ${escapeHtml(badge)}</span>`).join("")
    : `<span class="empty-hint">尚未取得徽章。</span>`;

  renderLevelRewards(rewards.levelRewards);

  const wrongArea = document.getElementById("wrong-book-area");
  if (wrongBook.length === 0) {
    wrongArea.innerHTML = `<div class="empty-hint">目前沒有錯題，繼續保持！</div>`;
  } else {
    wrongArea.innerHTML = wrongBook
      .slice()
      .reverse()
      .map((w) => {
        const unit = getUnitByVersion(version, w.unitId);
        return `
          <div class="wrong-item">
            <div class="wrong-prompt">${unit ? unit.icon : ""} ${escapeHtml(w.prompt)}</div>
            <div class="wrong-answers">你的答案：${escapeHtml(w.yourAnswer)} ・ 正確答案：${escapeHtml(
          w.correctAnswer
        )} ・ ${w.date}</div>
            <div class="wrong-explanation">解析：${escapeHtml(w.explanation)}</div>
          </div>
        `;
      })
      .join("");
  }
}

function renderLevelRewards(levelRewards) {
  document.getElementById("p-level-reward-note").textContent = levelRewards.maxMilestoneNote;
  document.getElementById("p-level-reward-unlocked").textContent = levelRewards.totalUnlockedAmount;
  document.getElementById("p-level-reward-confirmed").textContent = levelRewards.totalConfirmedAmount;
  document.getElementById("p-level-reward-list").innerHTML = levelRewards.milestones
    .map((m) => {
      const state = m.confirmed ? "confirmed" : m.unlocked ? "unlocked" : "locked";
      let status;
      if (m.confirmed) {
        status = `<span>✅ 已確認發放</span>`;
      } else if (m.unlocked) {
        status = `<button class="btn small" data-confirm-level="${m.level}">確認領取</button>`;
      } else {
        status = `<span>🔒 尚未解鎖</span>`;
      }
      return `
        <div class="level-reward-item ${state}">
          <div>
            <strong>Lv.${m.level}</strong>
            <div class="unit-meta">零用錢 ${m.amount} 元</div>
          </div>
          ${status}
        </div>
      `;
    })
    .join("");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const loginForm = document.getElementById("parent-login-form");
const passwordInput = document.getElementById("txt-parent-password");
const passwordError = document.getElementById("parent-password-error");
const parentLock = document.getElementById("parent-lock");
const parentDashboard = document.getElementById("parent-dashboard");

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!verifyParentPassword(passwordInput.value)) {
    passwordError.textContent = "密碼錯誤，請重新輸入。";
    passwordInput.value = "";
    passwordInput.focus();
    return;
  }

  isParentAuthorized = true;
  passwordError.textContent = "";
  passwordInput.value = "";
  parentLock.hidden = true;
  parentDashboard.hidden = false;
  render();
});

document.getElementById("reset-btn").addEventListener("click", () => {
  if (
    isParentAuthorized &&
    confirm("確定要清除所有學習紀錄嗎？此動作無法復原。")
  ) {
    resetState();
    render();
  }
});

// 等級獎品「確認領取」按鈕採事件委派，因為清單內容是動態產生的。
// 一律先檢查 isParentAuthorized，未通過家長密碼授權時完全不執行任何確認動作，
// 確保小朋友無法自行標記獎品已領取。
document.getElementById("p-level-reward-list").addEventListener("click", (event) => {
  const btn = event.target.closest("[data-confirm-level]");
  if (!btn || !isParentAuthorized) return;
  const level = Number(btn.dataset.confirmLevel);
  if (!confirm(`確定要標記 Lv.${level} 獎品為「已確認發放」嗎？此動作無法復原。`)) return;
  const result = confirmLevelReward(level);
  if (!result.ok) {
    alert(result.message);
  }
  render();
});

passwordInput.focus();

// 雲端同步狀態一律顯示（不含學習內容，不需要家長密碼即可看到），
// 讓家長在輸入密碼前就知道這台裝置目前是離線還是已登入雲端帳號。
onSyncStatusChange((status) => {
  document.getElementById("parent-sync-text").textContent = describeSyncStatus(status);
  // 已登入雲端且資料剛完成合併/同步時，若家長專區已解鎖，重新整理畫面顯示最新資料。
  if (isParentAuthorized && (status.mode === "synced" || status.mode === "error")) {
    render();
  }
});
initSync();
