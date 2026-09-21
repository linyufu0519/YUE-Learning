// js/question-engine.js
// 動態題目產生與抽題邏輯：每次練習隨機抽題，並支援難度與智慧練習。
import { simplifyFraction } from "./logic.js";

export const PRACTICE_QUESTION_COUNT = 10;
export const DIFFICULTIES = ["easy", "medium", "hard"];
export const DIFFICULTY_LABELS = {
  smart: "智慧練習",
  easy: "基礎",
  medium: "進階",
  hard: "挑戰",
};

function frac(num, den = 1) {
  return simplifyFraction({ num, den });
}

function fractionText(value) {
  const f = simplifyFraction(value);
  if (f.den === 1) return String(f.num);
  if (Math.abs(f.num) > f.den) {
    const sign = f.num < 0 ? "-" : "";
    const abs = Math.abs(f.num);
    const whole = Math.floor(abs / f.den);
    const rest = abs % f.den;
    if (rest === 0) return `${sign}${whole}`;
    return `${sign}${whole}又${rest}/${f.den}`;
  }
  return `${f.num}/${f.den}`;
}

function multiply(a, b) {
  return simplifyFraction({ num: a.num * b.num, den: a.den * b.den });
}

function divide(a, b) {
  return simplifyFraction({ num: a.num * b.den, den: a.den * b.num });
}

function shuffle(list, rng = Math.random) {
  const result = list.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function uniqueWrongChoices(answer, seeds) {
  const set = new Set([answer]);
  const choices = [answer];
  for (const seed of seeds) {
    const text = fractionText(seed);
    if (!set.has(text)) {
      set.add(text);
      choices.push(text);
    }
    if (choices.length >= 4) break;
  }
  while (choices.length < 4) {
    const fallback = `${choices.length}/${choices.length + 2}`;
    if (!set.has(fallback)) {
      set.add(fallback);
      choices.push(fallback);
    }
  }
  return choices;
}

function buildQuestion({ id, unitId, difficulty, type, prompt, answer, hint, explanation, choices = null }) {
  const answerText = fractionText(answer);
  const question = {
    id,
    unitId,
    difficulty,
    type,
    prompt,
    answer: answerText,
    hint,
    explanation,
  };
  if (type === "choice") {
    question.choices = choices || uniqueWrongChoices(answerText, [
      frac(answer.num + 1, answer.den),
      frac(answer.num, answer.den + 1),
      frac(answer.num + answer.den, answer.den),
      frac(Math.max(1, answer.num - 1), answer.den),
    ]);
  }
  return question;
}

function makeMultiplyQuestion(a, b, difficulty, index, type = "input") {
  const answer = multiply(a, b);
  const aText = fractionText(a);
  const bText = fractionText(b);
  return buildQuestion({
    id: `fm-${difficulty}-${index}-${a.num}_${a.den}x${b.num}_${b.den}`,
    unitId: "fraction-multiply",
    difficulty,
    type,
    prompt: `${aText} × ${bText} = ?`,
    answer,
    hint: "分數相乘時，分子乘分子、分母乘分母，再化成最簡分數。",
    explanation: `${aText} × ${bText} = ${a.num}×${b.num} / ${a.den}×${b.den} = ${fractionText(answer)}`,
  });
}

function makeDivideQuestion(a, b, difficulty, index, type = "input") {
  const answer = divide(a, b);
  const aText = fractionText(a);
  const bText = fractionText(b);
  return buildQuestion({
    id: `fd-${difficulty}-${index}-${a.num}_${a.den}d${b.num}_${b.den}`,
    unitId: "fraction-divide",
    difficulty,
    type,
    prompt: `${aText} ÷ ${bText} = ?`,
    answer,
    hint: "除以一個分數，等於乘以它的倒數。",
    explanation: `${aText} ÷ ${bText} = ${aText} × ${fractionText(frac(b.den, b.num))} = ${fractionText(answer)}`,
  });
}

function multiplicationBank() {
  const easyPairs = [
    [frac(1, 2), frac(1, 3)],
    [frac(2, 3), frac(1, 4)],
    [frac(3, 5), frac(1, 2)],
    [frac(4, 7), frac(1, 2)],
    [frac(2, 5), frac(3, 4)],
    [frac(3, 8), frac(2, 3)],
    [frac(5, 6), frac(1, 5)],
    [frac(3, 10), frac(5, 9)],
    [frac(1, 4), frac(6, 7)],
    [frac(2, 9), frac(3, 5)],
    [frac(5, 12), frac(4, 5)],
    [frac(7, 8), frac(2, 7)],
  ];
  const mediumPairs = [
    [frac(2), frac(3, 4)],
    [frac(3), frac(2, 5)],
    [frac(5, 4), frac(2, 3)],
    [frac(7, 3), frac(3, 7)],
    [frac(9, 5), frac(5, 6)],
    [frac(4, 3), frac(6, 7)],
    [frac(11, 6), frac(3, 4)],
    [frac(8, 9), frac(27, 16)],
    [frac(3, 2), frac(4, 9)],
    [frac(5, 3), frac(6, 10)],
  ];
  const hardPairs = [
    [frac(13, 5), frac(10, 39)],
    [frac(17, 6), frac(9, 34)],
    [frac(7, 4), frac(12, 21)],
    [frac(11, 8), frac(16, 33)],
    [frac(9, 2), frac(4, 27)],
    [frac(15, 7), frac(14, 45)],
    [frac(19, 10), frac(25, 38)],
    [frac(5, 12), frac(18, 25)],
    [frac(21, 8), frac(16, 63)],
    [frac(14, 9), frac(27, 28)],
  ];
  return [
    ...easyPairs.map((p, i) => makeMultiplyQuestion(p[0], p[1], "easy", i, i % 2 ? "choice" : "input")),
    ...mediumPairs.map((p, i) => makeMultiplyQuestion(p[0], p[1], "medium", i, i % 2 ? "input" : "choice")),
    ...hardPairs.map((p, i) => makeMultiplyQuestion(p[0], p[1], "hard", i, "input")),
    buildQuestion({
      id: "fm-hard-word-juice",
      unitId: "fraction-multiply",
      difficulty: "hard",
      type: "choice",
      prompt: "一瓶果汁的 3/4 是蘋果汁，喝掉整瓶的 2/3，喝掉的蘋果汁佔整瓶幾分之幾？",
      answer: frac(1, 2),
      hint: "把「3/4 的 2/3」想成 3/4 × 2/3。",
      explanation: "3/4 × 2/3 = 6/12 = 1/2",
    }),
  ];
}

function divisionBank() {
  const easyPairs = [
    [frac(1, 2), frac(1, 4)],
    [frac(2, 3), frac(1, 3)],
    [frac(3, 4), frac(3)],
    [frac(5, 6), frac(5, 3)],
    [frac(4, 5), frac(2, 5)],
    [frac(7, 8), frac(7, 4)],
    [frac(2, 9), frac(2, 3)],
    [frac(3, 10), frac(3, 5)],
    [frac(6, 7), frac(3, 7)],
    [frac(5, 12), frac(5, 6)],
    [frac(8, 9), frac(4, 9)],
    [frac(9, 10), frac(3, 10)],
  ];
  const mediumPairs = [
    [frac(3, 4), frac(2, 3)],
    [frac(5, 6), frac(10, 9)],
    [frac(7, 5), frac(14, 15)],
    [frac(9, 4), frac(3, 8)],
    [frac(11, 6), frac(11, 18)],
    [frac(5), frac(2, 3)],
    [frac(8, 3), frac(4, 9)],
    [frac(13, 10), frac(13, 5)],
    [frac(15, 8), frac(5, 16)],
    [frac(7, 2), frac(7, 6)],
  ];
  const hardPairs = [
    [frac(13, 5), frac(26, 15)],
    [frac(17, 6), frac(34, 9)],
    [frac(21, 8), frac(7, 12)],
    [frac(11, 4), frac(22, 15)],
    [frac(25, 6), frac(5, 18)],
    [frac(19, 10), frac(38, 25)],
    [frac(14, 9), frac(7, 27)],
    [frac(16, 5), frac(8, 15)],
    [frac(27, 11), frac(9, 22)],
    [frac(35, 12), frac(5, 18)],
  ];
  return [
    ...easyPairs.map((p, i) => makeDivideQuestion(p[0], p[1], "easy", i, i % 2 ? "choice" : "input")),
    ...mediumPairs.map((p, i) => makeDivideQuestion(p[0], p[1], "medium", i, i % 2 ? "input" : "choice")),
    ...hardPairs.map((p, i) => makeDivideQuestion(p[0], p[1], "hard", i, "input")),
    buildQuestion({
      id: "fd-hard-word-ribbon",
      unitId: "fraction-divide",
      difficulty: "hard",
      type: "choice",
      prompt: "有 3又1/2 公尺緞帶，每 7/8 公尺剪成一段，可以剪成幾段？",
      answer: frac(4),
      hint: "先把 3又1/2 化成 7/2，再除以 7/8。",
      explanation: "7/2 ÷ 7/8 = 7/2 × 8/7 = 4",
    }),
  ];
}

export function getQuestionBank(unitId) {
  if (unitId === "fraction-multiply") return multiplicationBank();
  if (unitId === "fraction-divide") return divisionBank();
  return [];
}

export function getAvailableQuestionCount(unitId) {
  return getQuestionBank(unitId).length;
}

export function chooseSmartDifficulty(summary = {}) {
  if (!summary.attempts || summary.attempts < 6) return "easy";
  if (summary.accuracy < 65) return "easy";
  if (summary.accuracy < 85) return "medium";
  return "hard";
}

export function selectPracticeQuestions({
  unitId,
  difficulty = "smart",
  count = PRACTICE_QUESTION_COUNT,
  recentQuestionIds = [],
  summary = {},
  rng = Math.random,
} = {}) {
  const actualDifficulty = difficulty === "smart" ? chooseSmartDifficulty(summary) : difficulty;
  const recent = new Set(recentQuestionIds || []);
  const bank = getQuestionBank(unitId).filter((q) => q.difficulty === actualDifficulty);
  const fresh = bank.filter((q) => !recent.has(q.id));
  const source = fresh.length >= Math.min(count, bank.length) ? fresh : bank;
  return shuffle(source, rng).slice(0, count).map((q) => ({
    ...q,
    choices: q.choices ? shuffle(q.choices, rng) : undefined,
    selectedDifficulty: actualDifficulty,
  }));
}
