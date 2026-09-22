// 康軒六上關卡題庫的純函式引擎；所有題目都由關卡、難度與 index 決定。
import { getCourseStage } from "./course-stages.js";

export const STAGE_DIFFICULTIES = Object.freeze(["easy", "medium", "hard"]);
const DIFFICULTY_OFFSET = Object.freeze({ easy: 0, medium: 1, hard: 2 });

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function choiceValues(answer, index) {
  const correct = Number(answer);
  const candidates = [correct, correct + 1, Math.max(0, correct - 1), correct + 2 + (index % 3)];
  return [...new Set(candidates)].slice(0, 4).map(formatNumber);
}

function buildQuestion({ stage, difficulty, index, concept, type, prompt, answer, hint, explanation }) {
  const question = {
    id: `${stage.id}-${difficulty}-${index}`,
    stageId: stage.id,
    unitId: stage.unitId,
    difficulty,
    concept: `${stage.topic}｜${concept}`,
    type,
    prompt: `【${stage.topic}】${prompt}`,
    answer: formatNumber(answer),
    hint,
    explanation,
  };
  if (type === "choice") {
    const choices = choiceValues(question.answer, index);
    question.choices = choices.sort((left, right) => ((Number(left) + index) % 5) - ((Number(right) + index) % 5));
  }
  return question;
}

function positiveSeed(index, difficulty, variant) {
  // 三個概念使用不重疊的數值區間，確保同一題池的答案可追溯且不重複。
  return 40 + index * 6 + DIFFICULTY_OFFSET[difficulty] * 2 + variant * 1000;
}

const GENERATORS = {
  "gcd-lcm": [
    (n) => ["最大公因數", "input", `求 ${n} 和 ${n * 2} 的最大公因數。`, n, "兩數都可被最大公因數整除。", `${n} 是 ${n} 和 ${n * 2} 共同的最大因數。`],
    (n) => ["最小公倍數", "choice", `求 ${n / 2} 和 ${n} 的最小公倍數。`, n, "其中一數是另一數的倍數時，較大的數就是最小公倍數。", `${n} 是 ${n / 2} 的 2 倍，所以最小公倍數是 ${n}。`],
    (n) => ["質因數分解", "input", `${n} ÷ 2 的 2 倍是多少？用這個關係檢查倍數。`, n, "先完成除法，再乘回 2。", `${n} ÷ 2 × 2 = ${n}，可用來檢查倍數關係。`],
  ],
  "fraction-division": [
    (n) => ["分數除法", "input", `${n}/5 ÷ 1/5 = ?`, n, "除以 1/5 等於乘以 5。", `${n}/5 × 5/1 = ${n}。`],
    (n) => ["倒數", "choice", `${n}/3 ÷ 1/3 = ?`, n, "除以 1/3 等於乘以 3。", `${n}/3 × 3/1 = ${n}。`],
    (n) => ["單位量", "input", `有 ${n} 公斤麵粉平均分成 2 份，每份幾公斤？`, n / 2, "平均分成 2 份要除以 2。", `${n} ÷ 2 = ${n / 2}（公斤）。`],
  ],
  "quantity-relations": [
    (n) => ["數列規律", "input", `數列是 ${n - 6}、${n}、${n + 6}，下一個數是多少？`, n + 12, "每次增加 6。", `${n + 6} + 6 = ${n + 12}。`],
    (n) => ["和不變", "choice", `${n} + 18 中，第一個加數加 3，第二個加數減 3，和是多少？`, n + 18, "一加一減相同數量，和不變。", `(${n} + 3) + (18 - 3) = ${n + 18}。`],
    (n) => ["間隔問題", "input", `長 ${n} 公尺的直線，每隔 1 公尺插一支旗子，兩端都插，共要幾支？`, n + 1, "間隔數加 1 才是旗子數。", `有 ${n} 個間隔，所以旗子數是 ${n} + 1 = ${n + 1}。`],
  ],
  "decimal-division": [
    (n) => ["整數除以小數", "input", `${n / 2} ÷ 0.5 = ?`, n, "除以 0.5 等於乘以 2。", `${n / 2} ÷ 0.5 = ${n / 2} × 2 = ${n}。`],
    (n) => ["小數除法", "choice", `${n / 4} ÷ 0.25 = ?`, n, "同時把被除數和除數乘 100。", `${n / 4} ÷ 0.25 = ${n}。`],
    (n) => ["平均分配", "input", `${n / 10} 公升果汁平均裝入 2 瓶，每瓶幾公升？`, n / 20, "平均分裝要用除法。", `${n / 10} ÷ 2 = ${n / 20}（公升）。`],
  ],
  ratio: [
    (n) => ["比值", "input", `${n}：2 的比值是多少？`, n / 2, "比值就是前項除以後項。", `${n} ÷ 2 = ${n / 2}。`],
    (n) => ["相等的比", "choice", `比是 1：2，前項是 ${n / 2}，後項是多少？`, n, "後項是前項的 2 倍。", `${n / 2} × 2 = ${n}。`],
    (n) => ["比的應用", "input", `紅、藍色球的比是 1：2，紅球有 ${n / 2} 顆，藍球有幾顆？`, n, "後項是前項的 2 倍。", `${n / 2} × 2 = ${n}（顆）。`],
  ],
  "review-one": [
    (n) => ["因數倍數複習", "input", `${n} 和 ${n * 2} 的最大公因數是多少？`, n, "較小數能整除較大數。", `${n} 可整除兩數，且沒有更大的共同因數。`],
    (n) => ["分數除法複習", "choice", `${n}/4 ÷ 1/4 = ?`, n, "除以分數要乘以倒數。", `${n}/4 × 4 = ${n}。`],
    (n) => ["小數與比複習", "input", `${n / 2}.0 ÷ 0.5 = ?`, n, "把除以 0.5 想成乘以 2。", `${n / 2}.0 × 2 = ${n}。`],
  ],
  "circle-perimeter": [
    (n) => ["圓周長", "input", `圓的周長是 ${n}π 公分，直徑是多少公分？`, n, "圓周長 = π × 直徑。", `${n}π ÷ π = ${n}（公分）。`],
    (n) => ["扇形弧長", "choice", `半圓的弧長是 ${n}π 公分，完整圓周長是多少個 π 公分？`, n * 2, "半圓弧長是完整圓周長的一半。", `${n}π × 2 = ${n * 2}π。`],
    (n) => ["扇形周長", "input", `半徑 ${n} 公分的半圓，直徑是多少公分？`, n * 2, "直徑是半徑的 2 倍。", `${n} × 2 = ${n * 2}（公分）。`],
  ],
  "circle-area": [
    (n) => ["圓面積", "input", `半徑 ${n} 公分的圓，面積是幾平方公分？（用 π 表示）請輸入 π 前的數字。`, n * n, "圓面積 = π × 半徑 × 半徑。", `${n} × ${n} = ${n * n}，所以面積是 ${n * n}π 平方公分。`],
    (n) => ["扇形面積", "choice", `半徑 ${n} 公分圓的半圓面積，π 前的數字是多少？`, (n * n) / 2, "半圓面積是完整圓面積的一半。", `${n} × ${n} ÷ 2 = ${(n * n) / 2}。`],
    (n) => ["半徑平方", "input", `半徑是 ${n} 公分，半徑的平方是多少？`, n * n, "同一個數相乘就是平方。", `${n} × ${n} = ${n * n}。`],
  ],
  speed: [
    (n) => ["速率", "input", `走 ${n * 2} 公里用 2 小時，時速是多少公里？`, n, "速率 = 距離 ÷ 時間。", `${n * 2} ÷ 2 = ${n}（公里/小時）。`],
    (n) => ["距離", "choice", `時速 ${n} 公里，行走 3 小時，共走幾公里？`, n * 3, "距離 = 速率 × 時間。", `${n} × 3 = ${n * 3}（公里）。`],
    (n) => ["單位換算", "input", `每分鐘走 ${n} 公尺，2 分鐘走幾公尺？`, n * 2, "距離 = 分速 × 時間。", `${n} × 2 = ${n * 2}（公尺）。`],
  ],
  scale: [
    (n) => ["比例尺", "input", `比例尺 1：${n}，圖上 1 公分代表實際幾公分？`, n, "比例尺後項表示實際長度。", `圖上 1 公分代表實際 ${n} 公分。`],
    (n) => ["圖上距離", "choice", `比例尺 1：100，實際距離 ${n * 100} 公分，圖上距離是多少公分？`, n, "實際距離除以比例尺後項。", `${n * 100} ÷ 100 = ${n}（公分）。`],
    (n) => ["單位換算", "input", `${n * 100} 公分是多少公尺？`, n, "100 公分 = 1 公尺。", `${n * 100} ÷ 100 = ${n}（公尺）。`],
  ],
  "review-two": [
    (n) => ["圓周長複習", "input", `圓的直徑是 ${n} 公分，周長是幾個 π 公分？`, n, "圓周長 = π × 直徑。", `π × ${n} = ${n}π。`],
    (n) => ["速率複習", "choice", `${n * 2} 公尺在 2 秒走完，秒速是多少公尺？`, n, "速率 = 距離 ÷ 時間。", `${n * 2} ÷ 2 = ${n}（公尺/秒）。`],
    (n) => ["比例尺複習", "input", `比例尺 1：${n}，圖上 2 公分代表實際幾公分？`, n * 2, "圖上距離乘以比例尺後項。", `2 × ${n} = ${n * 2}（公分）。`],
  ],
};

export function generateStageQuestion(stageId, difficulty = "easy", index = 0) {
  const stage = getCourseStage(stageId);
  if (!stage) throw new RangeError(`找不到關卡：${stageId}`);
  if (!STAGE_DIFFICULTIES.includes(difficulty)) throw new RangeError(`不支援的難度：${difficulty}`);
  if (!Number.isInteger(index) || index < 0) throw new RangeError("index 必須是非負整數。");

  const templates = GENERATORS[stage.generatorKey];
  const variant = index % templates.length;
  const n = positiveSeed(index, difficulty, variant);
  const [concept, type, prompt, answer, hint, explanation] = templates[variant](n);
  return buildQuestion({ stage, difficulty, index, concept, type, prompt, answer, hint, explanation });
}

export function generateStageQuestionPool(stageId, difficulty = "easy", count = 50) {
  if (!Number.isInteger(count) || count < 1) throw new RangeError("count 必須是正整數。");
  return Array.from({ length: count }, (_, index) => generateStageQuestion(stageId, difficulty, index));
}

export function selectStageQuestions({ stageId, difficulty = "easy", count = 10, recentQuestionIds = [], rng = Math.random }) {
  if (!Number.isInteger(count) || count < 1) throw new RangeError("count 必須是正整數。");
  if (typeof rng !== "function") throw new TypeError("rng 必須是函式。");
  const recent = new Set(recentQuestionIds);
  const pool = generateStageQuestionPool(stageId, difficulty, Math.max(50, count + recent.size));
  const candidates = [...pool.filter((question) => !recent.has(question.id)), ...pool.filter((question) => recent.has(question.id))];
  const selected = [];
  while (selected.length < count && candidates.length) {
    const index = Math.min(candidates.length - 1, Math.max(0, Math.floor(rng() * candidates.length)));
    selected.push(candidates.splice(index, 1)[0]);
  }
  return selected;
}
