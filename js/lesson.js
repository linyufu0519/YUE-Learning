// js/lesson.js
import { resolveUnit, getLessonForVersion, isPracticeAvailable, getVersionLabel } from "./curriculum.js";
import { recordLessonRead } from "./storage.js";

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
    ${renderList("自我檢查", lesson.checks)}
    <div class="lesson-actions">
      <button class="btn secondary" id="btn-complete-lesson">我讀完了</button>
      ${
        practiceReady
          ? `<a class="btn" href="practice.html?unit=${unit.id}">前往練習</a>`
          : `<button class="btn" disabled>練習題庫建置中</button>`
      }
      <a class="btn outline" href="index.html">回首頁</a>
    </div>
    <div class="lesson-message" id="lesson-message" aria-live="polite"></div>
  `;

  document.getElementById("btn-complete-lesson").addEventListener("click", () => {
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
