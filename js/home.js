// js/home.js
import { UNITS, QUESTION_BANKS } from "./data.js";
import { getUnitSummary, getStreak } from "./storage.js";

function renderTodayTask() {
  const activeUnits = UNITS.filter((u) => u.available);
  // 挑選正確率最低（最需要複習）的可用單元作為今日任務
  let target = activeUnits[0];
  let lowest = 101;
  for (const u of activeUnits) {
    const bank = QUESTION_BANKS[u.id] || [];
    const summary = getUnitSummary(u.id, bank.length);
    const score = summary.attempts === 0 ? -1 : summary.accuracy;
    if (score < lowest) {
      lowest = score;
      target = u;
    }
  }

  const bank = QUESTION_BANKS[target.id] || [];
  const summary = getUnitSummary(target.id, bank.length);

  document.getElementById("task-title").textContent = `今天挑戰：${target.title}`;
  document.getElementById("task-desc").textContent =
    summary.attempts === 0
      ? `共 ${bank.length} 題，第一次挑戰加油！`
      : `目前正確率 ${summary.accuracy}%，再練習一次讓自己更進步！`;
  const btn = document.getElementById("task-btn");
  btn.href = `practice.html?unit=${target.id}`;
}

function renderOverallProgress() {
  const activeUnits = UNITS.filter((u) => u.available);
  let totalAttempts = 0;
  let totalCorrect = 0;
  let totalCompleted = 0;
  let totalQuestions = 0;

  for (const u of activeUnits) {
    const bank = QUESTION_BANKS[u.id] || [];
    const summary = getUnitSummary(u.id, bank.length);
    totalAttempts += summary.attempts;
    totalCorrect += summary.correct;
    totalCompleted += Math.round((summary.progress / 100) * bank.length);
    totalQuestions += bank.length;
  }

  const streak = getStreak();
  const accuracy = totalAttempts === 0 ? 0 : Math.round((totalCorrect / totalAttempts) * 100);
  const progress = totalQuestions === 0 ? 0 : Math.round((totalCompleted / totalQuestions) * 100);

  document.getElementById("stat-streak").textContent = streak.count || 0;
  document.getElementById("stat-accuracy").textContent = `${accuracy}%`;
  document.getElementById("stat-attempts").textContent = totalAttempts;
  document.getElementById("stat-progress").textContent = `${progress}%`;
  document.getElementById("overall-progress-bar").style.width = `${progress}%`;
}

function renderUnitGrid() {
  const grid = document.getElementById("unit-grid");
  grid.innerHTML = "";

  for (const unit of UNITS) {
    const bank = QUESTION_BANKS[unit.id] || [];
    const summary = unit.available ? getUnitSummary(unit.id, bank.length) : null;

    const card = document.createElement(unit.available ? "a" : "div");
    card.className = `unit-card ${unit.available ? "available" : "locked"}`;
    if (unit.available) {
      card.href = `practice.html?unit=${unit.id}`;
    }

    let badge = "";
    if (!unit.available) {
      badge = `<span class="badge locked">敬請期待</span>`;
    } else if (summary.attempts === 0) {
      badge = `<span class="badge new">可挑戰</span>`;
    } else if (summary.accuracy >= 80) {
      badge = `<span class="badge done">已熟練</span>`;
    }

    card.innerHTML = `
      ${badge}
      <div class="unit-icon">${unit.icon}</div>
      <h3>${unit.title}</h3>
      <div class="unit-meta">${unit.semester}${unit.available ? ` · 共 ${bank.length} 題` : ""}</div>
      <p class="unit-desc">${unit.description}</p>
      ${
        unit.available
          ? `<div class="progress-bar-track"><div class="progress-bar-fill" style="width:${summary.progress}%;"></div></div>
             <div class="unit-meta">正確率 ${summary.accuracy}% ・ 完成度 ${summary.progress}%</div>`
          : `<div class="unit-meta">準備中，敬請期待！</div>`
      }
    `;
    grid.appendChild(card);
  }
}

renderTodayTask();
renderOverallProgress();
renderUnitGrid();
