// js/lesson.js
import { resolveUnit, getLessonForVersion, isPracticeAvailable, getVersionLabel } from "./curriculum.js";
import { recordLessonRead, isLessonCompletedBefore, getSemesterProgress } from "./storage.js";
import { canCompleteSelfCheck } from "./logic.js";
import { getStageById } from "./course-stages.js";
import { isStageUnlocked } from "./stage-progress.js";

const params = new URLSearchParams(window.location.search);
const stageId = params.get("stage");
const stage = stageId ? getStageById(stageId) : null;
const unitId = stage?.unitId || params.get("unit");
const { version, unit } = resolveUnit(unitId);
const baseLesson = unit ? getLessonForVersion(version, unitId) : null;
const lesson = stage && baseLesson ? buildStageLesson(stage, baseLesson) : baseLesson;
const area = document.getElementById("lesson-area");

if (stage && !isStageUnlocked(getSemesterProgress(), stage.id)) {
  area.innerHTML = `<p>🔒 請先完成前一關，再回來挑戰這一關。</p><a class="btn" href="index.html">回學習地圖</a>`;
} else if (!unit || !lesson) {
  area.textContent = "找不到這個單元的教學內容。";
} else {
  document.getElementById("lesson-title").textContent = `${unit.icon} ${lesson.title}`;
  document.title = `${lesson.title} | 林小玥六年級數學學習站`;
  const subtitleEl = document.querySelector(".subtitle");
  if (subtitleEl) subtitleEl.textContent = `${getVersionLabel(version)}．先學觀念，再練習挑戰`;
  renderLesson();
}

function renderLesson() {
  const practiceReady = Boolean(stage) || isPracticeAvailable(version, unit.id);
  const checks = Array.isArray(lesson.checks) ? lesson.checks : [];
  const completedBefore = stage
    ? (getSemesterProgress().completedActions?.[stage.id] || []).includes("lesson")
    : isLessonCompletedBefore(unit.id);
  area.innerHTML = `
    <h2>${escapeHtml(lesson.title)}</h2>
    <p>${escapeHtml(lesson.intro)}</p>
    ${renderList("重點概念", lesson.concepts)}
    ${renderList("解題步驟", lesson.steps)}
    ${renderList("常見錯誤", lesson.mistakes)}
    <div class="lesson-section">
      <h3>例題解析</h3>
      ${lesson.examples.map(renderExample).join("")}
    </div>
    <div class="lesson-section">
      <h3>自我檢查</h3>
      ${
        completedBefore
          ? `<p class="lesson-completed-badge">✅ 你已經完成過這個單元的自我檢查，複習可以再勾一次！</p>`
          : ""
      }
      ${
        checks.length
          ? `<ul class="lesson-checklist">
              ${checks
                .map(
                  (item, i) =>
                    `<li><label><input type="checkbox" class="self-check-box" data-index="${i}" /> ${escapeHtml(item)}</label></li>`
                )
                .join("")}
            </ul>
            <p class="lesson-check-hint" id="lesson-check-hint">請全部勾選確認你都讀懂了，才能按下「我讀完了」。</p>`
          : `<p class="lesson-check-hint">這個單元沒有額外的自我檢查項目，讀完內容就可以按「我讀完了」。</p>`
      }
    </div>
    <div class="lesson-actions">
      <button class="btn secondary" id="btn-complete-lesson" ${
        canCompleteSelfCheck(checks.length, 0) ? "" : "disabled"
      }>我讀完了</button>
      ${
        practiceReady
          ? `<a class="btn" href="${
              stage ? `practice.html?stage=${stage.id}` : `practice.html?unit=${unit.id}`
            }">前往練習</a>`
          : `<button class="btn" disabled>練習題庫建置中</button>`
      }
      <a class="btn outline" href="index.html">回首頁</a>
    </div>
    <div class="lesson-message" id="lesson-message" aria-live="polite"></div>
  `;

  const completeBtn = document.getElementById("btn-complete-lesson");
  const checkboxes = Array.from(area.querySelectorAll(".self-check-box"));

  function refreshButtonState() {
    const checkedCount = checkboxes.filter((box) => box.checked).length;
    completeBtn.disabled = !canCompleteSelfCheck(checks.length, checkedCount);
  }

  checkboxes.forEach((box) => box.addEventListener("change", refreshButtonState));

  completeBtn.addEventListener("click", () => {
    if (completeBtn.disabled) return;
    const result = recordLessonRead(unit.id, stage?.id || null);
    document.getElementById("lesson-message").textContent = result.lessonMessage;
  });
}

function buildStageLesson(currentStage, source) {
  const topic = currentStage.topic;
  const related = (source.concepts || []).filter((item) =>
    item.includes(topic.replace(/^[0-9-]+\s*/, "")) || item.includes(topic.split("與")[0])
  );
  return {
    title: `第 ${currentStage.order} 關：${topic}`,
    intro: `本關專注學習「${topic}」。先理解觀念、完成自我檢查，再進行 10 題練習。`,
    concepts: related.length
      ? related
      : [
          `本關主題：${topic}。`,
          `能說明「${topic}」的核心概念與使用時機。`,
          `能依題意選擇正確方法並檢查答案是否合理。`,
        ],
    steps: source.steps || ["先讀懂題意。", "列出算式。", "計算並檢查答案。"],
    mistakes: source.mistakes || ["沒有確認單位或題目條件。", "算完後沒有檢查答案合理性。"],
    examples: source.examples?.slice(0, 2) || [],
    checks: [
      `我能用自己的話說明「${topic}」。`,
      `我知道「${topic}」常見的解題步驟。`,
      `我能檢查「${topic}」題目的答案是否合理。`,
    ],
  };
}


function renderList(title, items) {
  return `
    <div class="lesson-section">
      <h3>${escapeHtml(title)}</h3>
      <ul class="lesson-list">
        ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </div>
  `;
}

function renderExample(example) {
  return `
    <div class="example-card">
      <strong>題目：</strong>${escapeHtml(example.question)}<br />
      <strong>答案：</strong>${escapeHtml(example.answer)}<br />
      <strong>解析：</strong>${escapeHtml(example.explanation)}
    </div>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
