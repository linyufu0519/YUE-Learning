// js/practice.js
import { getUnitById } from "./data.js";
import { gradeAnswer } from "./logic.js";
import {
  getRecentQuestionIds,
  getUnitSummary,
  recordAnswer,
} from "./storage.js";
import {
  DIFFICULTY_LABELS,
  PRACTICE_QUESTION_COUNT,
  getAvailableQuestionCount,
  selectPracticeQuestions,
} from "./question-engine.js";

const params = new URLSearchParams(window.location.search);
const unitId = params.get("unit");
const unit = getUnitById(unitId);
let selectedDifficulty = params.get("difficulty") || "smart";
let questions = [];

const questionArea = document.getElementById("question-area");
const summaryArea = document.getElementById("summary-area");
const progressLabel = document.getElementById("progress-label");
const progressBar = document.getElementById("practice-progress-bar");
const liveAccuracy = document.getElementById("live-accuracy");

let currentIndex = 0;
let sessionCorrect = 0;
let answeredCurrent = false;

if (!unit || !unit.available) {
  questionArea.innerHTML = `
    <p>⚠️ 這個單元目前尚未開放練習，請先閱讀教學內容。</p>
    <a class="btn" href="index.html">回首頁</a>
  `;
} else {
  document.getElementById("unit-title").textContent = `${unit.icon} ${unit.title}`;
  document.title = `${unit.title} | 林小玥六年級數學學習站`;
  document.getElementById("ddl-difficulty").value = selectedDifficulty;
  document.getElementById("ddl-difficulty").addEventListener("change", (event) => {
    selectedDifficulty = event.target.value;
    startPractice();
  });
  document.getElementById("btn-restart-practice").addEventListener("click", startPractice);
  startPractice();
}

function startPractice() {
  const total = getAvailableQuestionCount(unitId);
  const summary = getUnitSummary(unitId, total);
  questions = selectPracticeQuestions({
    unitId,
    difficulty: selectedDifficulty,
    count: PRACTICE_QUESTION_COUNT,
    recentQuestionIds: getRecentQuestionIds(unitId),
    summary,
  });
  currentIndex = 0;
  sessionCorrect = 0;
  questionArea.style.display = "block";
  summaryArea.style.display = "none";
  renderQuestion();
}

function renderQuestion() {
  answeredCurrent = false;
  const q = questions[currentIndex];
  progressLabel.textContent = `第 ${currentIndex + 1} / ${questions.length} 題（${DIFFICULTY_LABELS[q.selectedDifficulty || q.difficulty]}）`;
  progressBar.style.width = `${(currentIndex / questions.length) * 100}%`;
  updateLiveAccuracy();

  const answerAreaHtml =
    q.type === "choice"
      ? `<div class="choice-list" id="choice-list">
          ${q.choices
            .map(
              (c, i) =>
                `<button class="choice-btn" data-value="${escapeAttr(c)}" data-index="${i}">${escapeHtml(c)}</button>`
            )
            .join("")}
        </div>`
      : `<div class="input-row">
          <input type="text" id="answer-input" placeholder="請輸入答案，例如 1/2 或 1又1/2" autocomplete="off" />
          <button class="btn" id="submit-btn">送出答案</button>
        </div>`;

  questionArea.innerHTML = `
    <div class="question-prompt">${escapeHtml(q.prompt)}</div>
    ${answerAreaHtml}
    <button class="hint-btn" id="hint-btn">💡 需要提示嗎？</button>
    <div class="hint-text" id="hint-text">${escapeHtml(q.hint || "")}</div>
    <div class="feedback-box" id="feedback-box">
      <div class="feedback-title" id="feedback-title"></div>
      <div class="explanation" id="feedback-explanation"></div>
    </div>
    <div class="practice-footer">
      <a class="btn outline" href="index.html">先離開</a>
      <button class="btn" id="next-btn" style="display:none;">${
        currentIndex === questions.length - 1 ? "查看結果" : "下一題"
      }</button>
    </div>
  `;

  document.getElementById("hint-btn").addEventListener("click", () => {
    document.getElementById("hint-text").classList.toggle("show");
  });

  if (q.type === "choice") {
    document.getElementById("choice-list").querySelectorAll(".choice-btn").forEach((btn) => {
      btn.addEventListener("click", () => handleAnswer(btn.dataset.value, btn));
    });
  } else {
    const input = document.getElementById("answer-input");
    const submitBtn = document.getElementById("submit-btn");
    const submit = () => handleAnswer(input.value, input);
    submitBtn.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });
    input.focus();
  }

  document.getElementById("next-btn").addEventListener("click", () => {
    currentIndex += 1;
    if (currentIndex >= questions.length) {
      showSummary();
    } else {
      renderQuestion();
    }
  });
}

function handleAnswer(userAnswer, element) {
  if (answeredCurrent) return;
  if (userAnswer == null || String(userAnswer).trim() === "") return;
  answeredCurrent = true;

  const q = questions[currentIndex];
  const isCorrect = gradeAnswer(q, userAnswer);
  if (isCorrect) sessionCorrect += 1;

  const state = recordAnswer({
    unitId,
    questionId: q.id,
    prompt: q.prompt,
    isCorrect,
    yourAnswer: String(userAnswer),
    correctAnswer: q.answer,
    explanation: q.explanation,
  });

  if (q.type === "choice") {
    document.querySelectorAll(".choice-btn").forEach((btn) => {
      btn.disabled = true;
      if (btn.dataset.value === String(q.answer)) {
        btn.classList.add("correct");
      } else if (btn === element && !isCorrect) {
        btn.classList.add("incorrect");
      }
    });
  } else {
    element.disabled = true;
    element.classList.add(isCorrect ? "correct" : "incorrect");
    document.getElementById("submit-btn").disabled = true;
  }

  const feedbackBox = document.getElementById("feedback-box");
  feedbackBox.classList.add("show", isCorrect ? "correct" : "incorrect");
  document.getElementById("feedback-title").textContent = isCorrect
    ? "✅ 答對了，太棒了！"
    : `❌ 答錯了，正確答案是 ${q.answer}`;
  document.getElementById("feedback-explanation").textContent = `解析：${q.explanation}`;
  if (state.rewardMessage) {
    const reward = document.createElement("div");
    reward.className = "explanation reward-feedback";
    reward.textContent = `鼓勵：${state.rewardMessage}`;
    feedbackBox.appendChild(reward);
  }

  document.getElementById("next-btn").style.display = "inline-block";
  progressBar.style.width = `${((currentIndex + 1) / questions.length) * 100}%`;
  updateLiveAccuracy();
}

function updateLiveAccuracy() {
  const answered = currentIndex + (answeredCurrent ? 1 : 0);
  const denom = answered === 0 ? currentIndex : answered;
  liveAccuracy.textContent = denom === 0 ? "0%" : `${Math.round((sessionCorrect / denom) * 100)}%`;
}

function showSummary() {
  questionArea.style.display = "none";
  summaryArea.style.display = "block";
  progressLabel.textContent = `完成 ${questions.length} / ${questions.length} 題`;
  progressBar.style.width = "100%";

  const accuracy = Math.round((sessionCorrect / questions.length) * 100);
  const summary = getUnitSummary(unitId, getAvailableQuestionCount(unitId));
  const emoji = accuracy >= 80 ? "🏆" : accuracy >= 50 ? "👍" : "💪";

  summaryArea.innerHTML = `
    <div class="big-emoji">${emoji}</div>
    <h2>本次練習完成！</h2>
    <div class="summary-stats">
      <div class="stat-box">
        <div class="stat-value">${sessionCorrect}/${questions.length}</div>
        <div class="stat-label">本次答對題數</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${accuracy}%</div>
        <div class="stat-label">本次正確率</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${summary.progress}%</div>
        <div class="stat-label">單元累計完成度</div>
      </div>
    </div>
    <div class="practice-footer" style="justify-content:center;">
      <button class="btn secondary" id="retry-btn">再練習一次</button>
      <a class="btn secondary" href="lesson.html?unit=${unitId}">回教學複習</a>
      <a class="btn outline" href="index.html">回首頁</a>
      <a class="btn" href="parent.html">查看家長進度檢視</a>
    </div>
  `;

  document.getElementById("retry-btn").addEventListener("click", () => {
    startPractice();
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(str) {
  return String(str).replace(/"/g, "&quot;");
}
