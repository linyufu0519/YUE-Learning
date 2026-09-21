// js/parent.js
import { UNITS, QUESTION_BANKS } from "./data.js";
import { getUnitSummary, getStreak, getWrongBook, resetState } from "./storage.js";

function render() {
  const streak = getStreak();
  const wrongBook = getWrongBook();
  const activeUnits = UNITS.filter((u) => u.available);

  let totalAttempts = 0;
  let latestDate = null;

  const tbody = document.getElementById("unit-table-body");
  tbody.innerHTML = "";

  for (const unit of activeUnits) {
    const bank = QUESTION_BANKS[unit.id] || [];
    const summary = getUnitSummary(unit.id, bank.length);
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

document.getElementById("reset-btn").addEventListener("click", () => {
  if (confirm("確定要清除所有學習紀錄嗎？此動作無法復原。")) {
    resetState();
    render();
  }
});

render();
