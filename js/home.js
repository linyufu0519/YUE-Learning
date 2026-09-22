// js/home.js
import { getUnitsForVersion, getAvailableQuestionCount, getVersionLabel, isPracticeAvailable } from "./curriculum.js";
import { getRewardSummary, getUnitSummary, getStreak, getCurrentVersion, getWrongBook } from "./storage.js";
import { describeSyncStatus } from "./sync-logic.js";
import { renderVersionSwitcher } from "./version-ui.js";
import { maskEmail, computeAccountPanelState, nextAccountPanelFlags, getNextMilestoneGap } from "./ui-logic.js";
import {
  initSync,
  onSyncStatusChange,
  getSyncStatus,
  registerAccount,
  loginAccount,
  logoutAccount,
} from "./sync-manager.js";

const version = getCurrentVersion();
const UNITS = getUnitsForVersion(version);

function renderVersionHeader() {
  const label = `${getVersionLabel(version)}．國小六年級`;
  document.getElementById("version-subtitle").textContent = label;
  document.title = `林小玥六年級數學學習站 | ${getVersionLabel(version)}`;
  renderVersionSwitcher("version-switcher-buttons");
}

function renderTodayTask() {
  const activeUnits = UNITS.filter((u) => isPracticeAvailable(version, u.id));
  if (activeUnits.length === 0) {
    document.getElementById("task-title").textContent = "先從教學模式開始吧！";
    document.getElementById("task-desc").textContent =
      "目前版本的練習題庫準備中，先閱讀教學內容，累積閱讀任務的 XP 吧！";
    const btn = document.getElementById("task-btn");
    btn.textContent = "前往教學模式";
    btn.href = `lesson.html?unit=${UNITS[0].id}`;
    return;
  }
  // 挑選正確率最低（最需要複習）的可用單元作為今日任務
  let target = activeUnits[0];
  let lowest = 101;
  for (const u of activeUnits) {
    const total = getAvailableQuestionCount(version, u.id);
    const summary = getUnitSummary(u.id, total, version);
    const score = summary.attempts === 0 ? -1 : summary.accuracy;
    if (score < lowest) {
      lowest = score;
      target = u;
    }
  }

  const total = getAvailableQuestionCount(version, target.id);
  const summary = getUnitSummary(target.id, total, version);

  document.getElementById("task-title").textContent = `今天挑戰：${target.title}`;
  document.getElementById("task-desc").textContent =
    summary.attempts === 0
      ? `題庫已擴充到 ${total} 題以上，先學觀念再挑戰！`
      : `目前正確率 ${summary.accuracy}%，再練習一次讓自己更進步！`;
  const btn = document.getElementById("task-btn");
  btn.textContent = "開始挑戰";
  btn.href = `practice.html?unit=${target.id}`;
}

function renderOverallProgress() {
  const activeUnits = UNITS.filter((u) => isPracticeAvailable(version, u.id));
  let totalAttempts = 0;
  let totalCorrect = 0;
  let totalCompleted = 0;
  let totalQuestions = 0;

  for (const u of activeUnits) {
    const total = getAvailableQuestionCount(version, u.id);
    const summary = getUnitSummary(u.id, total, version);
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

function renderWrongReviewEntry() {
  const count = getWrongBook(version).length;
  const summary = document.getElementById("wrong-review-summary");
  const button = document.getElementById("wrong-review-btn");
  if (count === 0) {
    summary.textContent = `目前${getVersionLabel(version)}沒有待複習的錯題，繼續保持！`;
    button.textContent = "查看錯題複習";
  } else {
    summary.textContent = `目前${getVersionLabel(version)}有 ${count} 題待複習，重新答對就會移出錯題本。`;
    button.textContent = `開始複習 ${count} 題錯題`;
  }
}

function renderUnitGrid() {
  const grid = document.getElementById("unit-grid");
  grid.innerHTML = "";

  for (const unit of UNITS) {
    const practiceAvailable = isPracticeAvailable(version, unit.id);
    const total = getAvailableQuestionCount(version, unit.id);
    const summary = practiceAvailable ? getUnitSummary(unit.id, total, version) : null;

    const card = document.createElement("div");
    card.className = `unit-card ${practiceAvailable ? "available" : "lesson-only"}`;

    let badge = "";
    if (!practiceAvailable) {
      badge = `<span class="badge pending">題庫建置中</span>`;
    } else if (summary.attempts === 0) {
      badge = `<span class="badge new">可挑戰</span>`;
    } else if (summary.accuracy >= 80) {
      badge = `<span class="badge done">已熟練</span>`;
    }

    card.innerHTML = `
      ${badge}
      <div class="unit-icon">${unit.icon}</div>
      <h3>${unit.title}</h3>
      <div class="unit-meta">${unit.semester}${practiceAvailable ? ` · 動態題庫 ${total} 題+` : " · 教學模式已開放"}</div>
      <p class="unit-desc">${unit.description}</p>
      ${
        practiceAvailable
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
  document.getElementById("reward-progress-bar").style.width = `${rewards.levelInfo.progress}%`;

  const badgeList = document.getElementById("badge-list");
  const visibleBadges = rewards.badges.filter((badge) => !String(badge).includes("星"));
  badgeList.innerHTML = visibleBadges.length
    ? visibleBadges.map((badge) => `<span class="mini-badge">🏅 ${badge}</span>`).join("")
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

  renderLevelRewards(rewards.levelRewards, rewards.levelInfo.level);
}

function renderLevelRewards(levelRewards, currentLevel) {
  document.getElementById("level-reward-note").textContent = levelRewards.maxMilestoneNote;

  const gap = getNextMilestoneGap(currentLevel, levelRewards.milestones);
  const levelEl = document.getElementById("level-reward-modal-level");
  levelEl.textContent = gap
    ? `目前等級 Lv.${currentLevel}，距離 Lv.${gap.level}（零用錢 ${gap.amount} 元）還差 ${gap.levelsRemaining} 級`
    : `目前等級 Lv.${currentLevel}，所有等級獎品里程碑都已解鎖囉！`;

  document.getElementById("level-reward-list").innerHTML = levelRewards.milestones
    .map((m) => {
      const state = m.confirmed ? "confirmed" : m.unlocked ? "unlocked" : "locked";
      const status = m.confirmed ? "✅ 已領取" : m.unlocked ? "🎁 已解鎖，待家長確認" : "🔒 尚未解鎖";
      return `
        <div class="level-reward-item ${state}">
          <div>
            <strong>Lv.${m.level}</strong>
            <div class="unit-meta">零用錢 ${m.amount} 元</div>
          </div>
          <span>${status}</span>
        </div>
      `;
    })
    .join("");
}

function setupLevelRewardModal() {
  const modal = document.getElementById("level-reward-modal");
  const openBtn = document.getElementById("btn-open-level-rewards");
  const closeBtn = document.getElementById("btn-close-level-rewards");
  const closeBtn2 = document.getElementById("btn-close-level-rewards-2");

  function openModal() {
    modal.hidden = false;
    closeBtn.focus();
  }
  function closeModal() {
    modal.hidden = true;
    openBtn.focus();
  }

  openBtn.addEventListener("click", openModal);
  closeBtn.addEventListener("click", closeModal);
  closeBtn2.addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) closeModal();
  });
}

renderVersionHeader();
renderTodayTask();
renderOverallProgress();
renderWrongReviewEntry();
renderRewards();
renderUnitGrid();
setupLevelRewardModal();

// ---- 帳號與雲端同步 ----
function setupAccountUI() {
  const statusEl = document.getElementById("sync-status");
  const errorEl = document.getElementById("auth-error");
  const form = document.getElementById("auth-form");
  const emailInput = document.getElementById("txt-email");
  const passwordInput = document.getElementById("txt-password");
  const btnLogin = document.getElementById("btn-login");
  const btnRegister = document.getElementById("btn-register");
  const btnLogout = document.getElementById("btn-logout");
  const btnExpand = document.getElementById("btn-expand-account");
  const btnCollapse = document.getElementById("btn-collapse-account");
  const formWrap = document.getElementById("account-form-wrap");
  const compactWrap = document.getElementById("sync-compact");
  const compactStatusEl = document.getElementById("sync-compact-status");
  const compactDetailEl = document.getElementById("sync-compact-detail");

  let panelFlags = { hasSyncedOnce: false, manualExpanded: false };

  function renderPanel(status) {
    panelFlags = nextAccountPanelFlags(status, panelFlags);
    const panel = computeAccountPanelState({ mode: status.mode, ...panelFlags });

    compactWrap.hidden = !panel.showCompact;
    formWrap.hidden = !panel.showForm;
    btnExpand.setAttribute("aria-expanded", String(!panel.showCompact));
    btnCollapse.style.display = panel.showCollapseButton ? "" : "none";

    if (panel.showCompact) {
      compactStatusEl.textContent =
        status.mode === "syncing" ? "☁️ 同步中…" : "☁️ 雲端同步已啟用";
      const emailText = maskEmail(status.user?.email);
      const timeText = status.lastSyncedAt
        ? `最近同步：${new Date(status.lastSyncedAt).toLocaleString("zh-TW", { hour12: false })}`
        : "";
      compactDetailEl.textContent = [emailText, timeText].filter(Boolean).join("・");
    }

    statusEl.textContent = describeSyncStatus(status);
    btnLogout.style.display = panel.signedIn ? "" : "none";
    btnLogin.style.display = panel.signedIn ? "none" : "";
    btnRegister.style.display = panel.signedIn ? "none" : "";
    emailInput.disabled = panel.signedIn;
    passwordInput.disabled = panel.signedIn;
  }

  onSyncStatusChange((status) => {
    renderPanel(status);
  });

  btnExpand.addEventListener("click", () => {
    panelFlags = { ...panelFlags, manualExpanded: true };
    renderPanel(getSyncStatus());
  });

  btnCollapse.addEventListener("click", () => {
    panelFlags = { ...panelFlags, manualExpanded: false };
    renderPanel(getSyncStatus());
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorEl.textContent = "";
    const result = await loginAccount(emailInput.value.trim(), passwordInput.value);
    if (!result.ok) {
      errorEl.textContent = result.message;
      return;
    }
    passwordInput.value = "";
  });

  btnRegister.addEventListener("click", async () => {
    errorEl.textContent = "";
    const result = await registerAccount(emailInput.value.trim(), passwordInput.value);
    if (!result.ok) {
      errorEl.textContent = result.message;
      return;
    }
    passwordInput.value = "";
  });

  btnLogout.addEventListener("click", async () => {
    panelFlags = { hasSyncedOnce: false, manualExpanded: false };
    await logoutAccount();
  });

  initSync();
}

setupAccountUI();
