// js/parent.js
import { UNITS } from "./data.js";
import { getAvailableQuestionCount } from "./question-engine.js";
import {
  getRewardSummary,
  getUnitSummary,
  getStreak,
  getWrongBook,
  resetState,
} from "./storage.js";
import { verifyParentPassword } from "./parent-auth.js";

let isParentAuthorized = false;

function render() {
  const streak = getStreak();
  const wrongBook = getWrongBook();
  const rewards = getRewardSummary();
  const activeUnits = UNITS.filter((u) => u.available);

  let totalAttempts = 0;
  let latestDate = null;

  const tbody = document.getElementById("unit-table-body");
  tbody.innerHTML = "";

  for (const unit of activeUnits) {
    const summary = getUnitSummary(unit.id, getAvailableQuestionCount(unit.id));
    totalAttempts += summary.attempts;
    if (summary.lastDate && (!latestDate || summary.lastDate > latestDate)) {
      latestDate = summary.lastDate;
    }

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${unit.icon} ${unit.title}</td>
      <td>${summary.attempts}</td>
      <td>${summary.attempts === 0 ? "—" : `${summary.accuracy}%`}</td>
      <td>${summary.progress}%</td>
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

  const wrongArea = document.getElementById("wrong-book-area");
  if (wrongBook.length === 0) {
    wrongArea.innerHTML = `<div class="empty-hint">目前沒有錯題，繼續保持！</div>`;
  } else {
    wrongArea.innerHTML = wrongBook
      .slice()
      .reverse()
      .map((w) => {
        const unit = UNITS.find((u) => u.id === w.unitId);
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

passwordInput.focus();
