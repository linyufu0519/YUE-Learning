// js/home.js
import { UNITS } from "./data.js";
import { getAvailableQuestionCount } from "./question-engine.js";
import { getRewardSummary, getUnitSummary, getStreak } from "./storage.js";

function renderTodayTask() {
  const activeUnits = UNITS.filter((u) => u.available);
  // 挑選正確率最低（最需要複習）的可用單元作為今日任務
  let target = activeUnits[0];
  let lowest = 101;
  for (const u of activeUnits) {
    const total = getAvailableQuestionCount(u.id);
    const summary = getUnitSummary(u.id, total);
    const score = summary.attempts === 0 ? -1 : summary.accuracy;
    if (score < lowest) {
      lowest = score;
      target = u;
    }
  }

  const total = getAvailableQuestionCount(target.id);
  const summary = getUnitSummary(target.id, total);

  document.getElementById("task-title").textContent = `今天挑戰：${target.title}`;
  document.getElementById("task-desc").textContent =
    summary.attempts === 0
      ? `題庫已擴充到 ${total} 題以上，先學觀念再挑戰！`
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
    const total = getAvailableQuestionCount(u.id);
    const summary = getUnitSummary(u.id, total);
    totalAttempts += summary.attempts;
    totalCorrect += summary.correct;
    totalCompleted += Math.round((summary.progress / 100) * total);
    totalQuestions += total;
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
    const total = getAvailableQuestionCount(unit.id);
    const summary = unit.available ? getUnitSummary(unit.id, total) : null;

    const card = document.createElement("div");
    card.className = `unit-card ${unit.available ? "available" : "locked"}`;

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
      <div class="unit-meta">${unit.semester}${unit.available ? ` · 動態題庫 ${total} 題+` : " · 基礎教學已開放"}</div>
      <p class="unit-desc">${unit.description}</p>
      ${
        unit.available
          ? `<div class="progress-bar-track"><div class="progress-bar-fill" style="width:${summary.progress}%;"></div></div>
             <div class="unit-meta">正確率 ${summary.accuracy}% ・ 完成度 ${summary.progress}%</div>
             <div class="unit-actions">
               <a class="btn secondary" href="lesson.html?unit=${unit.id}">先學習</a>
               <a class="btn" href="practice.html?unit=${unit.id}">開始練習</a>
             </div>`
          : `<div class="unit-meta">先閱讀基礎教學，題庫準備中。</div>
             <div class="unit-actions">
               <a class="btn secondary" href="lesson.html?unit=${unit.id}">教學模式</a>
               <button class="btn" disabled>練習待開放</button>
             </div>`
      }
    `;
    grid.appendChild(card);
  }
}

function renderRewards() {
  const rewards = getRewardSummary();
  document.getElementById("reward-title").textContent = rewards.levelInfo.title;
  document.getElementById("reward-level").textContent = rewards.levelInfo.level;
  document.getElementById("reward-xp").textContent = rewards.xp;
  document.getElementById("reward-stars").textContent = rewards.stars;
  document.getElementById("reward-progress-bar").style.width = `${rewards.levelInfo.progress}%`;

  const badgeList = document.getElementById("badge-list");
  badgeList.innerHTML = rewards.badges.length
    ? rewards.badges.map((badge) => `<span class="mini-badge">🏅 ${badge}</span>`).join("")
    : `<span class="empty-hint">完成每日任務就能收集徽章！</span>`;

  document.getElementById("mission-list").innerHTML = rewards.missions
    .map(
      (mission) => `
        <div class="mission-item ${mission.done ? "done" : ""}">
          <div>
            <strong>${mission.done ? "✅" : "⬜"} ${mission.title}</strong>
            <div class="unit-meta">${mission.description}</div>
          </div>
          <span>${Math.min(mission.value, mission.target)} / ${mission.target}</span>
        </div>
      `
    )
    .join("");
}

renderTodayTask();
renderOverallProgress();
renderRewards();
renderUnitGrid();
