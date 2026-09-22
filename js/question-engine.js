// js/question-engine.js
// 動態題目產生與抽題邏輯：每次練習隨機抽題，並支援難度與智慧練習。
import { gcd, simplifyFraction } from "./logic.js";

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

function buildTextChoiceQuestion({ id, unitId, difficulty, prompt, answer, hint, explanation, choices }) {
  return {
    id,
    unitId,
    difficulty,
    type: "choice",
    prompt,
    answer,
    hint,
    explanation,
    choices,
  };
}

function buildTextQuestion({ id, unitId, difficulty, type = "input", prompt, answer, hint, explanation, choices = null }) {
  const question = {
    id,
    unitId,
    difficulty,
    type,
    prompt,
    answer: String(answer),
    hint,
    explanation,
  };
  if (type === "choice") {
    question.choices = choices || uniqueTextChoices(String(answer), []);
  }
  return question;
}

function formatDecimal(value) {
  const rounded = Math.round((value + Number.EPSILON) * 1000) / 1000;
  return String(rounded).replace(/\.?0+$/, "");
}

function decimalChoices(answer, seeds) {
  return uniqueTextChoices(formatDecimal(answer), seeds.map(formatDecimal));
}

function lcm(a, b) {
  return Math.abs(a * b) / gcd(a, b);
}

function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i += 1) {
    if (n % i === 0) return false;
  }
  return true;
}

function primeFactors(n) {
  const factors = [];
  let value = n;
  for (let d = 2; d * d <= value; d += 1) {
    while (value % d === 0) {
      factors.push(d);
      value /= d;
    }
  }
  if (value > 1) factors.push(value);
  return factors;
}

function factorText(n) {
  return primeFactors(n).join("×");
}

function makePrimeQuestion(n, difficulty, index) {
  const answer = isPrime(n) ? "質數" : "合數";
  return buildTextChoiceQuestion({
    id: `kx1-prime-${difficulty}-${index}-${n}`,
    unitId: "kx-gcf-lcm",
    difficulty,
    prompt: `${n} 是質數還是合數？`,
    answer,
    choices: ["質數", "合數"],
    hint: "只有 1 和自己兩個因數的是質數；除了 1 和自己以外還有其他因數的是合數。",
    explanation: isPrime(n)
      ? `${n} 只有 1 和 ${n} 兩個因數，所以是質數。`
      : `${n} 除了 1 和 ${n}，還有其他因數，所以是合數。`,
  });
}

function makeFactorQuestion(n, difficulty, index) {
  const answer = factorText(n);
  const options = uniqueTextChoices(answer, [
    String(n),
    `${primeFactors(n)[0]}×${Math.floor(n / primeFactors(n)[0])}`,
    primeFactors(n).slice().reverse().join("×"),
    `${answer}×1`,
  ]);
  return buildTextChoiceQuestion({
    id: `kx1-factor-${difficulty}-${index}-${n}`,
    unitId: "kx-gcf-lcm",
    difficulty,
    prompt: `${n} 的質因數分解是哪一個？`,
    answer,
    choices: options,
    hint: "把一個合數拆成全部都是質數相乘的形式。",
    explanation: `${n} = ${answer}，每一個因數都是質數。`,
  });
}

function uniqueTextChoices(answer, seeds) {
  const choices = [answer];
  const seen = new Set(choices);
  for (const seed of seeds) {
    if (seed && !seen.has(seed)) {
      seen.add(seed);
      choices.push(seed);
    }
    if (choices.length >= 4) break;
  }
  while (choices.length < 4) {
    const fallback = `選項${choices.length + 1}`;
    if (!seen.has(fallback)) choices.push(fallback);
  }
  return choices;
}

function makeGcfLcmQuestion(kind, a, b, difficulty, index, type = "input") {
  const answerValue = kind === "gcf" ? gcd(a, b) : lcm(a, b);
  const label = kind === "gcf" ? "最大公因數" : "最小公倍數";
  const seeds =
    kind === "gcf"
      ? [frac(Math.min(a, b)), frac(answerValue + 1), frac(Math.max(1, answerValue - 1))]
      : [frac(Math.max(a, b)), frac(answerValue + Math.min(a, b)), frac(Math.max(1, answerValue - Math.min(a, b)))];
  return buildQuestion({
    id: `kx1-${kind}-${difficulty}-${index}-${a}_${b}`,
    unitId: "kx-gcf-lcm",
    difficulty,
    type,
    prompt: `${a} 和 ${b} 的${label}是多少？`,
    answer: frac(answerValue),
    hint:
      kind === "gcf"
        ? "先列出兩數共同的因數，再找最大的那一個。"
        : "先列出兩數共同的倍數，再找最小的那一個。",
    explanation:
      kind === "gcf"
        ? `${a} 和 ${b} 的共同因數中最大的是 ${answerValue}，所以最大公因數是 ${answerValue}。`
        : `${a} 和 ${b} 的共同倍數中最小的是 ${answerValue}，所以最小公倍數是 ${answerValue}。`,
    choices: type === "choice" ? uniqueWrongChoices(String(answerValue), seeds) : null,
  });
}

function makeSequenceQuestion(start, step, shownCount, difficulty, index, type = "input") {
  const seq = Array.from({ length: shownCount }, (_, i) => start + step * i);
  const answer = start + step * shownCount;
  return buildTextQuestion({
    id: `kx3-seq-${difficulty}-${index}-${start}_${step}_${shownCount}`,
    unitId: "kx-quantity-relations",
    difficulty,
    type,
    prompt: `觀察數列：${seq.join("、")}、下一個數是多少？`,
    answer,
    hint: `相鄰兩數每次都增加 ${step}。`,
    explanation: `${seq[seq.length - 1]} 再加 ${step}，所以下一個數是 ${answer}。`,
    choices: type === "choice" ? uniqueTextChoices(String(answer), [answer + step, answer - step, answer + 1]) : null,
  });
}

function makeShapeRuleQuestion(base, add, n, difficulty, index, type = "input") {
  const answer = base + add * n;
  return buildTextQuestion({
    id: `kx3-shape-${difficulty}-${index}-${base}_${add}_${n}`,
    unitId: "kx-quantity-relations",
    difficulty,
    type,
    prompt: `某圖形第 n 個需要 ${base}+${add}×n 個小方塊，第 ${n} 個需要幾個小方塊？`,
    answer,
    hint: `把 n=${n} 代入 ${base}+${add}×n。`,
    explanation: `${base}+${add}×${n}=${answer}，所以第 ${n} 個需要 ${answer} 個小方塊。`,
    choices: type === "choice" ? uniqueTextChoices(String(answer), [answer + add, answer - add, base * n + add]) : null,
  });
}

function makeInvariantQuestion(kind, a, b, change, difficulty, index, type = "input") {
  let prompt = "";
  let answer = 0;
  let hint = "";
  let explanation = "";
  if (kind === "sum") {
    answer = a + b;
    prompt = `${a}+${b}=${answer}。如果第一個數增加 ${change}，第二個數減少 ${change}，新的和是多少？`;
    hint = "一個加多少，另一個減多少，總和不變。";
    explanation = `(${a}+${change})+(${b}-${change}) = ${answer}，所以和不變。`;
  } else if (kind === "product") {
    answer = a * b;
    prompt = `${a}×${b}=${answer}。如果第一個數乘以 ${change}，第二個數除以 ${change}，新的積是多少？`;
    hint = "一個因數乘以幾，另一個因數除以同一個數，積不變。";
    explanation = `(${a}×${change})×(${b}÷${change}) = ${a}×${b} = ${answer}。`;
  } else {
    answer = a / b;
    prompt = `${a}÷${b}=${answer}。如果被除數和除數都乘以 ${change}，新的商是多少？`;
    hint = "被除數和除數同乘一個不為 0 的數，商不變。";
    explanation = `(${a}×${change})÷(${b}×${change}) = ${a}÷${b} = ${answer}。`;
  }
  return buildTextQuestion({
    id: `kx3-invariant-${kind}-${difficulty}-${index}-${a}_${b}_${change}`,
    unitId: "kx-quantity-relations",
    difficulty,
    type,
    prompt,
    answer,
    hint,
    explanation,
    choices: type === "choice" ? uniqueTextChoices(String(answer), [answer + change, Math.max(1, answer - change), answer * change]) : null,
  });
}

function makeIntervalQuestion(kind, a, b, difficulty, index, type = "input") {
  let prompt = "";
  let answer = 0;
  let hint = "";
  let explanation = "";
  if (kind === "lineTrees") {
    answer = a - 1;
    prompt = `一排種了 ${a} 棵樹，相鄰兩棵樹之間有幾個間隔？`;
    hint = "直線排列且兩端都有樹，間隔數 = 棵數 - 1。";
    explanation = `${a} 棵樹形成 ${a}-1=${answer} 個間隔。`;
  } else if (kind === "lamps") {
    answer = a / b + 1;
    prompt = `一條 ${a} 公尺長的步道，從起點到終點每 ${b} 公尺放一盞燈，兩端都放，共要幾盞？`;
    hint = "先算間隔數，再加上起點那一盞。";
    explanation = `${a}÷${b}=${a / b} 個間隔，兩端都放所以燈數是 ${a / b}+1=${answer}。`;
  } else {
    answer = a * b;
    prompt = `圓形花圃每隔 ${b} 公尺插一面旗，總共有 ${a} 個間隔，花圃一圈長幾公尺？`;
    hint = "圓形排列沒有端點，總長 = 間隔數 × 每段長。";
    explanation = `${a}×${b}=${answer}，所以一圈長 ${answer} 公尺。`;
  }
  return buildTextQuestion({
    id: `kx3-interval-${kind}-${difficulty}-${index}-${a}_${b}`,
    unitId: "kx-quantity-relations",
    difficulty,
    type,
    prompt,
    answer,
    hint,
    explanation,
    choices: type === "choice" ? uniqueTextChoices(String(answer), [answer + 1, Math.max(1, answer - 1), answer + b]) : null,
  });
}

function makeDecimalDivisionQuestion({ id, difficulty, dividend, divisor, label = "", type = "input" }) {
  const answer = dividend / divisor;
  const answerText = formatDecimal(answer);
  const promptLabel = label ? `${label}：` : "";
  return buildTextQuestion({
    id,
    unitId: "kx-decimal-division",
    difficulty,
    type,
    prompt: `${promptLabel}${formatDecimal(dividend)} ÷ ${formatDecimal(divisor)} = ?`,
    answer: answerText,
    hint: "可以把除數變成整數：被除數和除數同時乘以 10、100 或 1000，商不變。",
    explanation: `${formatDecimal(dividend)} ÷ ${formatDecimal(divisor)} = ${answerText}。小數答案末尾的 0 可省略，例如 ${answerText} 和 ${answerText}.0 表示同一個數。`,
    choices: type === "choice" ? decimalChoices(answer, [answer + 1, answer * 10, Math.max(0, answer - 0.5)]) : null,
  });
}

function makeDecimalWordQuestion(total, each, item, difficulty, index, type = "input") {
  const answer = total / each;
  const answerText = formatDecimal(answer);
  return buildTextQuestion({
    id: `kx4-word-${difficulty}-${index}-${total}_${each}`,
    unitId: "kx-decimal-division",
    difficulty,
    type,
    prompt: `${formatDecimal(total)} 公升${item}，每瓶裝 ${formatDecimal(each)} 公升，可以裝幾瓶？`,
    answer: answerText,
    hint: "把總量除以每瓶容量，就是可以裝的瓶數。",
    explanation: `${formatDecimal(total)}÷${formatDecimal(each)}=${answerText}，所以可以裝 ${answerText} 瓶。`,
    choices: type === "choice" ? decimalChoices(answer, [answer + 1, answer - 1, answer * 2]) : null,
  });
}

function makeDecimalRelationQuestion(kind, dividend, divisor, factor, difficulty, index, type = "choice") {
  const original = dividend / divisor;
  let prompt = "";
  let answer = original;
  let hint = "";
  let explanation = "";
  if (kind === "sameQuotient") {
    prompt = `${formatDecimal(dividend)}÷${formatDecimal(divisor)}=${formatDecimal(original)}。被除數和除數都乘以 ${factor}，新的商是多少？`;
    hint = "被除數和除數同時乘以相同的非 0 數，商不變。";
    explanation = `兩邊同乘 ${factor}，商仍是 ${formatDecimal(original)}。`;
  } else if (kind === "dividendTimes") {
    answer = original * factor;
    prompt = `${formatDecimal(dividend)}÷${formatDecimal(divisor)}=${formatDecimal(original)}。只有被除數乘以 ${factor}，新的商是多少？`;
    hint = "除數不變，被除數變成幾倍，商也變成幾倍。";
    explanation = `只有被除數乘以 ${factor}，所以商是 ${formatDecimal(original)}×${factor}=${formatDecimal(answer)}。`;
  } else {
    answer = original / factor;
    prompt = `${formatDecimal(dividend)}÷${formatDecimal(divisor)}=${formatDecimal(original)}。只有除數乘以 ${factor}，新的商是多少？`;
    hint = "被除數不變，除數變成幾倍，商會變成原來的幾分之一。";
    explanation = `只有除數乘以 ${factor}，所以商是 ${formatDecimal(original)}÷${factor}=${formatDecimal(answer)}。`;
  }
  return buildTextQuestion({
    id: `kx4-relation-${kind}-${difficulty}-${index}-${dividend}_${divisor}_${factor}`,
    unitId: "kx-decimal-division",
    difficulty,
    type,
    prompt,
    answer: formatDecimal(answer),
    hint,
    explanation,
    choices: type === "choice" ? decimalChoices(answer, [original, answer * factor, answer + factor]) : null,
  });
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

function gcfLcmBank() {
  const easyPrime = [2, 4, 5, 9, 11, 15];
  const easyGcf = [
    [12, 18],
    [8, 12],
    [10, 15],
  ];
  const easyLcm = [
    [3, 4],
    [4, 6],
    [5, 10],
  ];
  const mediumFactors = [18, 24, 30, 36, 42, 45];
  const mediumGcf = [
    [16, 24],
    [21, 35],
    [28, 42],
  ];
  const mediumLcm = [
    [6, 8],
    [9, 12],
    [10, 15],
  ];
  const hardGcf = [
    [48, 72],
    [54, 90],
    [84, 126],
    [96, 144],
    [75, 125],
    [108, 180],
  ];
  const hardLcm = [
    [12, 18],
    [14, 21],
    [16, 24],
    [18, 30],
    [20, 32],
    [24, 36],
  ];
  return [
    ...easyPrime.map((n, i) => makePrimeQuestion(n, "easy", i)),
    ...easyGcf.map((p, i) => makeGcfLcmQuestion("gcf", p[0], p[1], "easy", i, i % 2 ? "choice" : "input")),
    ...easyLcm.map((p, i) => makeGcfLcmQuestion("lcm", p[0], p[1], "easy", i, i % 2 ? "input" : "choice")),
    ...mediumFactors.map((n, i) => makeFactorQuestion(n, "medium", i)),
    ...mediumGcf.map((p, i) => makeGcfLcmQuestion("gcf", p[0], p[1], "medium", i, i % 2 ? "input" : "choice")),
    ...mediumLcm.map((p, i) => makeGcfLcmQuestion("lcm", p[0], p[1], "medium", i, i % 2 ? "choice" : "input")),
    ...hardGcf.map((p, i) => makeGcfLcmQuestion("gcf", p[0], p[1], "hard", i, "input")),
    ...hardLcm.map((p, i) => makeGcfLcmQuestion("lcm", p[0], p[1], "hard", i, "input")),
  ];
}

function quantityRelationsBank() {
  const easySequences = [
    [2, 3, 4],
    [5, 5, 4],
    [1, 4, 5],
    [10, 2, 4],
    [3, 6, 4],
    [7, 3, 5],
  ];
  const easyIntervals = [
    ["lineTrees", 8, 0],
    ["lineTrees", 12, 0],
    ["lamps", 20, 5],
    ["lamps", 24, 6],
  ];
  const mediumShapes = [
    [1, 3, 6],
    [2, 4, 5],
    [3, 2, 9],
    [5, 5, 4],
    [4, 6, 5],
    [6, 3, 8],
  ];
  const mediumInvariants = [
    ["sum", 38, 45, 7],
    ["sum", 126, 74, 20],
    ["product", 12, 8, 2],
    ["product", 15, 6, 3],
  ];
  const hardIntervals = [
    ["circle", 9, 4],
    ["circle", 12, 3],
    ["lamps", 45, 5],
    ["lamps", 72, 8],
    ["circle", 15, 6],
    ["lamps", 96, 12],
  ];
  const hardInvariants = [
    ["quotient", 84, 7, 3],
    ["quotient", 96, 12, 4],
    ["product", 18, 14, 7],
    ["sum", 245, 155, 35],
  ];
  return [
    ...easySequences.map((p, i) => makeSequenceQuestion(p[0], p[1], p[2], "easy", i, i % 2 ? "choice" : "input")),
    ...easyIntervals.map((p, i) => makeIntervalQuestion(p[0], p[1], p[2], "easy", i, i % 2 ? "input" : "choice")),
    ...mediumShapes.map((p, i) => makeShapeRuleQuestion(p[0], p[1], p[2], "medium", i, i % 2 ? "choice" : "input")),
    ...mediumInvariants.map((p, i) => makeInvariantQuestion(p[0], p[1], p[2], p[3], "medium", i, i % 2 ? "input" : "choice")),
    ...hardIntervals.map((p, i) => makeIntervalQuestion(p[0], p[1], p[2], "hard", i, "input")),
    ...hardInvariants.map((p, i) => makeInvariantQuestion(p[0], p[1], p[2], p[3], "hard", i, "input")),
  ];
}

function decimalDivisionBank() {
  const easyPairs = [
    [6, 0.5],
    [8, 0.4],
    [9, 0.3],
    [12, 0.6],
    [15, 0.5],
    [21, 0.7],
    [24, 0.8],
    [27, 0.9],
    [30, 0.6],
    [36, 0.4],
  ];
  const mediumPairs = [
    [4.8, 0.6],
    [7.5, 1.5],
    [9.6, 1.2],
    [12.6, 0.9],
    [13.5, 2.7],
    [18.4, 2.3],
    [22.5, 1.5],
    [31.2, 2.4],
  ];
  const hardPairs = [
    [5.25, 0.25],
    [8.64, 0.12],
    [14.4, 0.16],
    [18.75, 1.25],
    [23.46, 3.4],
    [45.6, 0.24],
    [62.5, 1.25],
  ];
  const wordPairs = [
    [7.5, 1.5, "柳橙汁"],
    [12.6, 0.9, "牛奶"],
    [18.75, 1.25, "果汁"],
  ];
  const relationPairs = [
    ["sameQuotient", 12, 0.6, 10],
    ["dividendTimes", 8.4, 1.2, 3],
    ["divisorTimes", 9.6, 0.8, 4],
  ];
  return [
    ...easyPairs.map((p, i) =>
      makeDecimalDivisionQuestion({ id: `kx4-easy-${i}-${p[0]}_${p[1]}`, difficulty: "easy", dividend: p[0], divisor: p[1], type: i % 2 ? "choice" : "input" })
    ),
    ...mediumPairs.map((p, i) =>
      makeDecimalDivisionQuestion({ id: `kx4-medium-${i}-${p[0]}_${p[1]}`, difficulty: "medium", dividend: p[0], divisor: p[1], type: i % 2 ? "input" : "choice" })
    ),
    ...wordPairs.map((p, i) => makeDecimalWordQuestion(p[0], p[1], p[2], "medium", i, i % 2 ? "choice" : "input")),
    ...hardPairs.map((p, i) =>
      makeDecimalDivisionQuestion({ id: `kx4-hard-${i}-${p[0]}_${p[1]}`, difficulty: "hard", dividend: p[0], divisor: p[1], label: "挑戰題", type: "input" })
    ),
    ...relationPairs.map((p, i) => makeDecimalRelationQuestion(p[0], p[1], p[2], p[3], "hard", i, i % 2 ? "input" : "choice")),
  ];
}

export function getQuestionBank(unitId) {
  if (unitId === "kx-gcf-lcm") return gcfLcmBank();
  if (unitId === "kx-quantity-relations") return quantityRelationsBank();
  if (unitId === "kx-decimal-division") return decimalDivisionBank();
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
