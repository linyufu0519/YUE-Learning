// js/lesson.js
import { resolveUnit, getLessonForVersion, isPracticeAvailable, getVersionLabel } from "./curriculum.js";
import { recordLessonRead, isLessonCompletedBefore } from "./storage.js";
import { canCompleteSelfCheck } from "./logic.js";

const params = new URLSearchParams(window.location.search);
const unitId = params.get("unit");
const { version, unit } = resolveUnit(unitId);
const lesson = unit ? getLessonForVersion(version, unitId) : null;
const area = document.getElementById("lesson-area");

if (!unit || !lesson) {
  area.textContent = "找不到這個單元的教學內容。";
} else {
  document.getElementById("lesson-title").textContent = `${unit.icon} ${lesson.title}`;
  document.title = `${lesson.title} | 林小玥六年級數學學習站`;
  const subtitleEl = document.querySelector(".subtitle");
  if (subtitleEl) subtitleEl.textContent = `${getVersionLabel(version)}．先學觀念，再練習挑戰`;
  renderLesson();
}

function renderLesson() {
  const practiceReady = isPracticeAvailable(version, unit.id);
  const checks = Array.isArray(lesson.checks) ? lesson.checks : [];
  const completedBefore = isLessonCompletedBefore(unit.id);
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
          ? `<a class="btn" href="practice.html?unit=${unit.id}">前往練習</a>`
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
    const result = recordLessonRead(unit.id);
    document.getElementById("lesson-message").textContent = result.lessonMessage;
  });
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
