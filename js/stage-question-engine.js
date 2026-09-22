// 康軒六上關卡題庫純函式引擎；題目只由 stageId、difficulty、index 決定。
import { COURSE_STAGES, getCourseStage } from "./course-stages.js";

export const STAGE_DIFFICULTIES = Object.freeze(["easy", "medium", "hard"]);

const PEOPLE = Object.freeze(["小玥", "小安", "志明", "雅婷", "老師", "爸爸", "媽媽", "店長"]);
const OBJECTS = Object.freeze(["積木", "卡片", "貼紙", "餅乾"]);
const PLACES = Object.freeze(["校園", "公園", "文具店", "圖書館", "運動場", "園遊會"]);
const LEVEL_LABEL = Object.freeze({ easy: "直接計算", medium: "反推與換算", hard: "生活應用與挑戰" });
const COGNITIVE_MODES = Object.freeze(["solve", "select", "verify"]);

function hashSeed(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(values, rng) {
  return values[Math.floor(rng() * values.length)];
}

function shuffle(values, rng) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(rng() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function gcd(left, right) {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function lcm(left, right) {
  return Math.abs(left * right) / gcd(left, right);
}

function divisors(value) {
  const result = [];
  for (let divisor = 1; divisor <= value; divisor += 1) {
    if (value % divisor === 0) result.push(divisor);
  }
  return result;
}

function round(value, digits = 2) {
  return Number(value.toFixed(digits));
}

function format(value) {
  return Number.isInteger(value) ? String(value) : String(round(value));
}

function frac(numerator, denominator) {
  if (denominator === 0) throw new RangeError("分母不可為 0。");
  const divisor = gcd(numerator, denominator);
  const reducedNumerator = numerator / divisor;
  const reducedDenominator = denominator / divisor;
  return reducedDenominator === 1 ? String(reducedNumerator) : `${reducedNumerator}/${reducedDenominator}`;
}

function mixed(numerator, denominator) {
  const whole = Math.floor(numerator / denominator);
  const remainder = numerator % denominator;
  return remainder ? `${whole}又${remainder}/${denominator}` : String(whole);
}

function result(concept, type, prompt, answer, hint, explanation, choices) {
  return { concept, type, prompt, answer: typeof answer === "number" ? format(answer) : String(answer), hint, explanation, choices };
}

function numericChoices(answer, rng) {
  const correct = Number(answer);
  if (!Number.isFinite(correct)) {
    const fractionMatch = String(answer).match(/^(-?\d+)\/(\d+)$/);
    if (fractionMatch) {
      const numerator = Number(fractionMatch[1]);
      const denominator = Number(fractionMatch[2]);
      return shuffle([
        String(answer),
        frac(numerator + 1, denominator),
        frac(numerator, denominator + 1),
        frac(numerator + denominator, denominator),
      ], rng).filter((value, index, values) => values.indexOf(value) === index);
    }
    return shuffle([String(answer), `不是${answer}`], rng);
  }
  const step = Number.isInteger(correct) ? Math.max(1, Math.floor(Math.abs(correct) / 6)) : 0.1;
  const values = [correct, round(correct + step), round(Math.max(0, correct - step)), round(correct + step * 2)];
  return shuffle([...new Set(values.map(format))], rng);
}

function wrongAnswerFor(generated) {
  const answer = String(generated.answer);
  const alternative = generated.choices?.map(String).find((choice) => choice !== answer);
  if (alternative) return alternative;
  if (/^-?\d+(?:\.\d+)?$/.test(answer)) {
    const value = Number(answer);
    return format(value + (Number.isInteger(value) ? 1 : 0.1));
  }
  const fractionMatch = answer.match(/^(-?\d+)\/(\d+)$/);
  if (fractionMatch) return `${Number(fractionMatch[1]) + 1}/${fractionMatch[2]}`;
  const opposite = { 質數: "合數", 合數: "質數", 正確: "不正確", 不正確: "正確" };
  return opposite[answer] || `不是${answer}`;
}

function applyCognitiveMode(generated, cognitiveMode, index, rng) {
  const transformed = { ...generated, cognitiveMode };
  if (cognitiveMode === "solve") {
    transformed.type = "input";
    delete transformed.choices;
    return transformed;
  }
  if (cognitiveMode === "select") {
    transformed.prompt = `請選出正確答案：${generated.prompt}`;
    transformed.type = "choice";
    transformed.choices = generated.choices || numericChoices(generated.answer, rng);
    return transformed;
  }
  const proposedAnswer = Math.floor(index / 9) % 2 === 0 ? String(generated.answer) : wrongAnswerFor(generated);
  const isCorrect = proposedAnswer === String(generated.answer);
  transformed.prompt = `先完成「${generated.prompt}」，再判斷答案 ${proposedAnswer} 是否正確。`;
  transformed.answer = isCorrect ? "正確" : "不正確";
  transformed.type = "choice";
  transformed.choices = ["正確", "不正確"];
  transformed.hint = `先自己完成原題，再比較同學寫的 ${proposedAnswer}。`;
  transformed.explanation = `${generated.hint}${generated.explanation}所以指定答案${isCorrect ? "正確" : "不正確"}。`;
  return transformed;
}

function parameters(stageId, difficulty, index, rng) {
  const permutationSeed = hashSeed(`${stageId}|${difficulty}|排列`);
  const multipliers = [1, 3, 7, 9, 11, 13, 17, 19, 21, 23, 27, 29, 31, 33, 37, 39, 41, 43, 47, 49];
  const sample = (index * multipliers[permutationSeed % multipliers.length] + permutationSeed % 50) % 50;
  return {
    n: 2 + (sample % 18),
    a: 3 + ((sample * 5 + Math.floor(sample / 10)) % 15),
    b: 2 + (sample % 10),
    c: 3 + ((sample * 7 + Math.floor(sample / 10)) % 10),
    person: pick(PEOPLE, rng),
    object: pick(OBJECTS, rng),
    place: pick(PLACES, rng),
  };
}

function complexity(difficulty, direct, reverse, application) {
  return difficulty === "easy" ? direct() : difficulty === "medium" ? reverse() : application();
}

const TOPIC_OPERATION_KEYS = Object.freeze({
  "質數與合數": ["classify-composite", "factor-count", "prime-application"],
  質因數分解: ["prime-factorize", "restore-from-primes", "prime-factor-application"],
  公因數: ["list-common-factors", "common-divisibility", "equal-grouping"],
  最大公因數: ["calculate-gcd", "reverse-gcd", "maximum-grouping"],
  公倍數: ["list-common-multiples", "common-multiple-check", "cycle-meeting"],
  最小公倍數: ["calculate-lcm", "reverse-lcm", "earliest-meeting"],
  短除法: ["short-division-gcd", "short-division-lcm", "short-division-application"],
  倒數: ["reciprocal-product", "reverse-reciprocal", "reciprocal-application"],
  整數除以分數: ["integer-divided-by-fraction", "reverse-integer-fraction", "integer-fraction-sharing"],
  分數除以整數: ["fraction-divided-by-integer", "reverse-fraction-integer", "fraction-integer-sharing"],
  同分母分數除法: ["same-denominator-division", "reverse-same-denominator", "same-denominator-application"],
  異分母分數除法: ["different-denominator-division", "reverse-different-denominator", "different-denominator-application"],
  帶分數除法: ["mixed-number-division", "reverse-mixed-number", "mixed-number-application"],
  商的意義: ["partitive-division", "quotative-division", "division-meaning-application"],
  單位量: ["unit-rate", "reverse-unit-rate", "unit-rate-application"],
  數列規律: ["sequence-next", "sequence-reverse", "sequence-two-step"],
  圖形規律: ["figure-count", "figure-index-reverse", "figure-growth"],
  和不變: ["constant-sum", "reverse-constant-sum", "constant-sum-application"],
  差不變: ["constant-difference", "reverse-constant-difference", "constant-difference-application"],
  積不變: ["constant-product", "reverse-constant-product", "constant-product-application"],
  商不變: ["constant-quotient", "reverse-constant-quotient", "constant-quotient-application"],
  間隔問題: ["line-interval", "reverse-interval", "closed-interval"],
  整數除以小數: ["integer-divided-by-decimal", "reverse-integer-decimal", "integer-decimal-application"],
  小數除以整數: ["decimal-divided-by-integer", "reverse-decimal-integer", "decimal-integer-application"],
  小數除以小數: ["decimal-divided-by-decimal", "reverse-decimal-decimal", "decimal-decimal-application"],
  商的小數點: ["decimal-point-placement", "reverse-decimal-point", "decimal-point-check"],
  估算: ["estimate-quotient", "estimate-range", "estimate-application"],
  除法關係: ["division-relationship", "reverse-division-relationship", "division-verification"],
  平均分配: ["equal-sharing", "reverse-equal-sharing", "sharing-remainder"],
  比的記法: ["ratio-notation", "ratio-term-reverse", "ratio-situation"],
  比值: ["ratio-value", "reverse-ratio-value", "ratio-value-application"],
  相等的比: ["equivalent-ratio", "missing-ratio-term", "equivalent-ratio-application"],
  最簡整數比: ["simplest-ratio", "expand-simple-ratio", "simple-ratio-application"],
  比的化簡: ["integer-ratio-reduction", "decimal-ratio-reduction", "fraction-ratio-reduction"],
  連比: ["three-term-ratio", "missing-three-term", "three-term-distribution"],
  圓周率: ["circumference-diameter-ratio", "restore-circumference", "wheel-pi-application"],
  直徑與半徑: ["radius-to-diameter", "diameter-to-radius", "diameter-radius-application"],
  圓周長: ["calculate-circumference", "reverse-diameter", "circumference-application"],
  扇形弧長: ["calculate-arc", "reverse-full-circle", "arc-application"],
  扇形周長: ["sector-perimeter", "reverse-sector-radius", "sector-fence"],
  反推半徑: ["circumference-to-radius", "area-to-radius", "reverse-radius-application"],
  圓面積: ["calculate-circle-area", "reverse-radius-square", "circle-area-application"],
  半徑平方: ["radius-square", "square-to-radius", "radius-square-comparison"],
  扇形面積: ["calculate-sector-area", "reverse-circle-area", "sector-area-application"],
  半圓面積: ["calculate-semicircle-area", "reverse-semicircle", "semicircle-application"],
  組合圖形: ["add-circle-areas", "subtract-circle-areas", "composite-area-application"],
  速率意義: ["distance-over-time", "reverse-speed", "compare-speeds"],
  距離: ["speed-times-time", "reverse-distance", "two-leg-distance"],
  時間: ["distance-over-speed", "reverse-time", "remaining-time"],
  平均速率: ["total-distance-over-total-time", "reverse-leg-distance", "two-leg-average-speed"],
  時速換算: ["hourly-speed", "hours-minutes-conversion", "hourly-two-step"],
  分速換算: ["minute-speed", "minutes-seconds-conversion", "minute-two-step"],
  秒速換算: ["second-speed", "seconds-minutes-conversion", "second-two-step"],
  放大圖: ["enlarge-length", "reverse-enlargement", "enlarge-area"],
  縮圖: ["shrink-length", "reverse-shrink", "shrink-area"],
  比例尺: ["read-scale", "reverse-scale", "scale-application"],
  圖上距離: ["calculate-map-distance", "reverse-map-distance", "map-route"],
  實際距離: ["calculate-real-distance", "reverse-real-distance", "real-route"],
  長度換算: ["centimeter-meter", "meter-kilometer", "length-conversion-application"],
  面積變化: ["area-scale-factor", "reverse-area-factor", "scaled-area-application"],
});

const REVIEW_TOPIC_TARGET = Object.freeze({
  因數倍數複習: "最大公因數",
  分數除法複習: "異分母分數除法",
  數量關係複習: "數列規律",
  小數與比複習: "比值",
  圓周長複習: "圓周長",
  圓面積複習: "圓面積",
  速率複習: "平均速率",
  單位換算複習: "長度換算",
  比例尺複習: "比例尺",
  綜合應用: "後半冊綜合",
});

const SCENARIO_PROFILE_BY_TOPIC = Object.freeze({
  "質數與合數": "number-structure",
  質因數分解: "number-structure",
  公因數: "factor-grouping",
  最大公因數: "factor-grouping",
  短除法: "factor-grouping",
  公倍數: "multiple-cycles",
  最小公倍數: "multiple-cycles",
  倒數: "fraction-sharing",
  整數除以分數: "fraction-sharing",
  分數除以整數: "fraction-sharing",
  同分母分數除法: "fraction-sharing",
  異分母分數除法: "fraction-sharing",
  帶分數除法: "fraction-sharing",
  商的意義: "fraction-sharing",
  單位量: "fraction-sharing",
  數列規律: "pattern-building",
  圖形規律: "pattern-building",
  和不變: "invariant-lab",
  差不變: "invariant-lab",
  積不變: "invariant-lab",
  商不變: "invariant-lab",
  間隔問題: "interval-planning",
  整數除以小數: "decimal-sharing",
  小數除以整數: "decimal-sharing",
  小數除以小數: "decimal-sharing",
  商的小數點: "decimal-sharing",
  估算: "decimal-sharing",
  除法關係: "decimal-sharing",
  平均分配: "decimal-sharing",
  比的記法: "ratio-mixture",
  比值: "ratio-mixture",
  相等的比: "ratio-mixture",
  最簡整數比: "ratio-mixture",
  比的化簡: "ratio-mixture",
  連比: "ratio-mixture",
  圓周率: "circle-boundary",
  直徑與半徑: "circle-boundary",
  圓周長: "circle-boundary",
  扇形弧長: "circle-boundary",
  扇形周長: "circle-boundary",
  反推半徑: "circle-boundary",
  圓面積: "circle-area",
  半徑平方: "circle-area",
  扇形面積: "circle-area",
  半圓面積: "circle-area",
  組合圖形: "circle-area",
  速率意義: "motion",
  距離: "motion",
  時間: "motion",
  平均速率: "motion",
  時速換算: "motion",
  分速換算: "motion",
  秒速換算: "motion",
  放大圖: "map-model",
  縮圖: "map-model",
  比例尺: "map-model",
  圖上距離: "map-model",
  實際距離: "map-model",
  長度換算: "map-model",
  面積變化: "map-model",
  後半冊綜合: "semester-challenge",
});

const SCENARIO_OPENERS = Object.freeze({
  "number-structure": Object.freeze([
    (person) => `${person}在數學角整理數字卡，想找出每個數的組成`,
    (person) => `${person}正在破解數字密碼，需要判斷因數與質數`,
    (person) => `${person}把數字貼到分類板上，準備檢查它們的特性`,
  ]),
  "factor-grouping": Object.freeze([
    (person, place) => `${person}在${place}分裝用品，想安排整齊且相同的組數`,
    (person) => `${person}正在把兩批材料平均分組，希望每組數量完全相同`,
    (person) => `${person}要把物品分成最多的相同組，正在比較可行的分法`,
  ]),
  "multiple-cycles": Object.freeze([
    (person, place) => `${person}在${place}記錄兩項活動的週期，想找出同時發生的時刻`,
    (person) => `${person}觀察兩盞燈規律閃爍，正在推算下一次一起亮的時間`,
    (person) => `${person}安排兩種固定間隔的活動，需要找出重合的次數`,
  ]),
  "fraction-sharing": Object.freeze([
    (person) => `${person}在烘焙教室分裝果汁與麵粉，想算出每份或可分幾份`,
    (person) => `${person}把一批材料依分數份量裝盒，正在確認能裝多少盒`,
    (person) => `${person}依食譜的分數用量分配材料，需要算清楚剩餘與份數`,
  ]),
  "pattern-building": Object.freeze([
    (person) => `${person}在創作區排列積木圖案，正在觀察下一步的數量規律`,
    (person) => `${person}用圖卡排出規律序列，想推算指定位置的數量`,
    (person) => `${person}記錄每一輪增加的圖形，正在找出前後項的關係`,
  ]),
  "invariant-lab": Object.freeze([
    (person) => `${person}在數學實驗桌調整兩個數，想讓運算結果保持不變`,
    (person) => `${person}改變算式中的數字，正在檢查和、差、積或商的規律`,
    (person) => `${person}用天平概念比較算式，希望調整後的結果仍然相同`,
  ]),
  "interval-planning": Object.freeze([
    (person, place) => `${person}在${place}安排路燈與座位，正在計算間隔和端點`,
    (person) => `${person}沿著步道等距放置標誌，需要算出間隔或標誌數`,
    (person) => `${person}規劃一圈等距設施，正在分辨封閉路線的間隔關係`,
  ]),
  "decimal-sharing": Object.freeze([
    (person) => `${person}在商店分裝飲料與材料，需要用小數除法算每份數量`,
    (person) => `${person}核對商品重量與份數，正在估算並計算小數商`,
    (person) => `${person}把帶有小數的總量平均分配，想確認商的小數點位置`,
  ]),
  "ratio-mixture": Object.freeze([
    (person) => `${person}在調飲區按比例混合果汁，正在確認各材料的份量關係`,
    (person) => `${person}依配方分裝不同材料，需要比較前項、後項與比值`,
    (person) => `${person}替活動分配三種用品，正用比和連比計算各份數量`,
  ]),
  "circle-boundary": Object.freeze([
    (person) => `${person}在工藝教室測量輪子與花圈，正在計算圓周和弧長`,
    (person) => `${person}替圓形跑道規劃一圈長度，需要運用直徑、半徑和圓周率`,
    (person) => `${person}製作扇形邊框，正在估算弧線與兩側半徑的總長`,
  ]),
  "circle-area": Object.freeze([
    (person) => `${person}在花園設計圓形花圃，正在估算圓面與扇形占地`,
    (person) => `${person}替圓桌和半圓地墊計算面積，需要比較不同區域`,
    (person) => `${person}規劃由圓形組成的圖案，正在計算增加或扣除的面積`,
  ]),
  motion: Object.freeze([
    (person) => `${person}在運動場記錄騎車與跑步行程，正在比較距離、時間和速率`,
    (person) => `${person}規劃交通路線，需要換算時速、分速或秒速`,
    (person) => `${person}整理兩段旅程的紀錄，想算出總距離與平均速率`,
  ]),
  "map-model": Object.freeze([
    (person) => `${person}在地圖教室規劃路線與模型，正在換算圖上和實際尺寸`,
    (person) => `${person}製作放大圖與縮圖，需要比較長度和面積的倍率`,
    (person) => `${person}查看校園平面圖，想用比例尺算出真實距離`,
  ]),
  "semester-challenge": Object.freeze([
    (person) => `${person}來到學期成果挑戰站，準備綜合運用圓、速率與比例尺`,
    (person) => `${person}正在完成六上總複習任務，需要判斷合適的解題方法`,
    (person) => `${person}參加數學闖關賽，準備把不同單元的知識連起來`,
  ]),
});

const LIFE_TARGET = Object.freeze({
  "gcd-lcm": "最大公因數",
  "fraction-division": "單位量",
  "decimal-division": "平均分配",
  ratio: "連比",
  "circle-perimeter": "圓周長",
  "circle-area": "組合圖形",
  speed: "平均速率",
  scale: "比例尺",
});

function effectiveTopic(stage) {
  if (stage.topic === "生活應用") return LIFE_TARGET[stage.generatorKey];
  return REVIEW_TOPIC_TARGET[stage.topic] || stage.topic;
}

function factorGenerator(topic, operationKey, difficulty, variant, v) {
  const common = v.n;
  const left = common * (v.b + 1);
  const right = common * (v.c + 1);
  const actualGcd = gcd(left, right);
  const actualLcm = lcm(left, right);
  if (topic === "質數與合數") {
    const composite = v.n * (v.b + 1);
    const factorList = divisors(composite);
    const nonFactor = [2, 3, 5, 7, 11, 13].find((value) => composite % value !== 0) || composite + 1;
    const hardQuestions = [
      () => result(operationKey, "choice", `${v.person}有 ${composite} 個積木，想平均分成每組至少 2 個。下列哪個每組數量可剛好分完，並能證明 ${composite} 是合數？`, v.n, "找一個大於 1、且小於原數的因數。", `${composite} ÷ ${v.n} = ${v.b + 1}，因此 ${v.n} 是非平凡因數，${composite} 是合數。`, [String(v.n), String(nonFactor), String(nonFactor + 2), String(composite - 1)]),
      () => result(operationKey, "input", `${composite} 的所有因數共有幾個？請先列出因數，再判斷它不是質數。`, factorList.length, "成對尋找能整除原數的數。", `${composite} 的因數是 ${factorList.join("、")}，共有 ${factorList.length} 個；因數超過 2 個，所以是合數。`),
      () => result(operationKey, "choice", `有人說「${composite} 是質數」。下列哪個反例因數能證明這個說法錯誤？`, v.n, "只要找到一個不是 1 或原數的因數，就能否定質數說法。", `${composite} ÷ ${v.n} = ${v.b + 1}，所以 ${v.n} 是反例因數。`, [String(v.n), String(nonFactor), "1", String(composite)])
    ];
    return complexity(
      difficulty,
      () => result(operationKey, "choice", `${composite} 可寫成 ${v.n} × ${v.b + 1}，所以它是質數還是合數？`, "合數", "可以寫成兩個大於 1 的整數相乘，就是合數。", `${composite} = ${v.n} × ${v.b + 1}，所以是合數。`, ["質數", "合數"]),
      () => result(operationKey, "choice", `某合數等於 ${v.n} × ${v.b + 1}，下列何者一定是它的因數？`, v.n, "乘法式中的乘數都是因數。", `${composite} ÷ ${v.n} = ${v.b + 1}。`, [String(v.n), String(v.n + 1), String(v.n + 2), String(v.n + 3)]),
      hardQuestions[variant]
    );
  }
  if (topic === "質因數分解" || topic === "短除法") {
    const product = v.n * v.b * v.c;
    return complexity(
      difficulty,
      () => result(operationKey, "input", `用${topic}分解後得到 ${v.n} × ${v.b} × ${v.c}，原數是多少？`, product, "把分解出的因數相乘。", `${v.n} × ${v.b} × ${v.c} = ${product}。`),
      () => result(operationKey, "input", `${product} 經${topic}分解為 ${v.n} × ${v.b} × □，□ 是多少？`, v.c, "用原數依序除以已知因數。", `${product} ÷ ${v.n} ÷ ${v.b} = ${v.c}。`),
      () => result(operationKey, "input", `${v.person}用${topic}把 ${product} 個${v.object}先分 ${v.n} 組，再把每組分 ${v.b} 份，每份幾個？`, v.c, "連續除以兩個分組數。", `${product} ÷ ${v.n} ÷ ${v.b} = ${v.c}。`)
    );
  }
  const useMultiple = topic === "公倍數" || topic === "最小公倍數";
  if (topic === "公因數") {
    return complexity(
      difficulty,
      () => result(operationKey, "input", `${actualGcd} 是 ${left} 和 ${right} 的公因數；兩數各除以它，商的和是多少？`, left / actualGcd + right / actualGcd, "公因數必須同時整除兩數。", `${left} ÷ ${actualGcd} + ${right} ÷ ${actualGcd} = ${left / actualGcd + right / actualGcd}。`),
      () => result(operationKey, "choice", `下列哪一個數可同時整除 ${left} 和 ${right}？`, actualGcd, "同時試除兩數，不要求最大。", `${actualGcd} 可同時整除兩數，所以是公因數。`, [String(actualGcd), String(actualLcm), String(actualLcm + 1), String(left + right)]),
      () => result(operationKey, "input", `${v.person}把 ${left} 張卡片與 ${right} 張貼紙分開包裝，每包都放 ${actualGcd} 張，兩種物品共可裝幾包？`, left / actualGcd + right / actualGcd, "公因數可作為兩種物品共同的每包數。", `${left} ÷ ${actualGcd} + ${right} ÷ ${actualGcd} = ${left / actualGcd + right / actualGcd}。`)
    );
  }
  if (topic === "公倍數") {
    return complexity(
      difficulty,
      () => result(operationKey, "input", `${actualLcm} 是 ${left} 和 ${right} 的公倍數；它分別是兩數的倍數次數之和是多少？`, actualLcm / left + actualLcm / right, "公倍數必須能被兩數整除。", `${actualLcm} ÷ ${left} + ${actualLcm} ÷ ${right} = ${actualLcm / left + actualLcm / right}。`),
      () => result(operationKey, "choice", `下列哪一個數同時是 ${left} 和 ${right} 的倍數？`, actualLcm, "共同倍數能同時被兩數整除。", `${actualLcm} 可同時被 ${left}、${right} 整除。`, [String(actualLcm), String(actualGcd), String(left + right), String(actualLcm + 1)]),
      () => result(operationKey, "input", `兩盞燈每 ${left} 秒與 ${right} 秒閃一次，經過 ${actualLcm * 2} 秒時，共同閃過幾次？`, 2, "共同發生的間隔是最小公倍數。", `${actualLcm * 2} ÷ ${actualLcm} = 2（次）。`)
    );
  }
  const direct = useMultiple ? actualLcm : actualGcd;
  const label = useMultiple ? "最小公倍數" : "最大公因數";
  return complexity(
    difficulty,
    () => result(operationKey, "input", `求 ${left} 和 ${right} 的${label}。`, direct, `分解兩數後求${label}。`, `${left} 和 ${right} 的${label}是 ${direct}。`),
    () => result(operationKey, "input", `已知 ${left} 和 ${right} 的${label}是 ${direct}，${direct} 分別除兩數後，商的和是多少？`, left / direct + right / direct, `用${label}分別除兩數。`, `${left} ÷ ${direct} + ${right} ÷ ${direct} = ${left / direct + right / direct}。`),
    () => result(operationKey, "input", useMultiple ? `兩班每 ${left} 天與 ${right} 天活動一次，最早同時活動後再過 ${direct} 天，是第幾次同時活動？` : `${v.person}將 ${left} 個${v.object}與 ${right} 張卡片分成最多相同組，每組共有幾件？`, useMultiple ? 2 : left / direct + right / direct, useMultiple ? "同時活動間隔是最小公倍數。" : "最多組數是最大公因數，再求每組總數。", useMultiple ? `每 ${direct} 天同時發生，故是第 2 次。` : `${left} ÷ ${direct} + ${right} ÷ ${direct} = ${left / direct + right / direct}。`)
  );
}

function fractionGenerator(topic, operationKey, difficulty, variant, v) {
  const d1 = v.b + 2;
  const d2 = d1 + v.c;
  const integer = v.n;
  if (topic === "倒數") {
    return complexity(
      difficulty,
      () => result(operationKey, "input", `${v.n}/${d1} 的倒數分子與分母的和是多少？`, v.n + d1, "倒數會交換分子、分母。", `倒數是 ${d1}/${v.n}，兩項和為 ${v.n + d1}。`),
      () => result(operationKey, "input", `某分數的倒數是 ${d1}/${v.n}，原分數的分子是多少？`, v.n, "再交換一次分子與分母。", `原分數是 ${v.n}/${d1}。`),
      () => result(operationKey, "input", `${v.person}要讓 ${v.n}/${d1} 與另一個分數相乘得到 1，另一個分數的分子與分母的和是多少？`, v.n + d1, "乘積為 1 時，另一個分數就是倒數。", `倒數是 ${d1}/${v.n}，分子與分母的和是 ${v.n + d1}。`)
    );
  }
  if (topic === "整數除以分數") {
    const numerator = 2 + (v.c % 4);
    const denominator = numerator * v.b;
    const answer = integer * denominator / numerator;
    return complexity(
      difficulty,
      () => result(operationKey, "input", `${integer} ÷ ${numerator}/${denominator} = ？`, answer, "整數除以分數要乘以倒數。", `${integer} × ${denominator}/${numerator} = ${answer}。`),
      () => result(operationKey, "input", `□ ÷ ${numerator}/${denominator} = ${answer}，□ 是多少？`, integer, "商乘除數可還原被除數。", `${answer} × ${numerator}/${denominator} = ${integer}。`),
      () => result(operationKey, "input", `${v.person}有 ${integer} 公升果汁，每瓶裝 ${numerator}/${denominator} 公升，可以裝滿幾瓶？`, answer, "用果汁總量除以每瓶容量。", `${integer} ÷ ${numerator}/${denominator} = ${answer}。`)
    );
  }
  if (topic === "分數除以整數") {
    const numerator = integer * v.b;
    const answer = frac(integer, d1);
    return complexity(
      difficulty,
      () => result(operationKey, "input", `${numerator}/${d1} ÷ ${v.b} = ？`, answer, "分數除以整數等於乘整數的倒數。", `${numerator}/${d1} × 1/${v.b} = ${answer}。`),
      () => result(operationKey, "input", `□ ÷ ${v.b} = ${answer}，□ 是多少？`, frac(numerator, d1), "商乘整數可還原原分數。", `${answer} × ${v.b} = ${frac(numerator, d1)}。`),
      () => result(operationKey, "input", `${v.person}把 ${numerator}/${d1} 公尺彩帶平均剪成 ${v.b} 段，每段長幾公尺？`, answer, "總長除以段數。", `${numerator}/${d1} ÷ ${v.b} = ${answer}。`)
    );
  }
  if (topic === "同分母分數除法") {
    const numerator = integer * v.b;
    const divisorNumerator = v.b;
    return complexity(
      difficulty,
      () => result(operationKey, "input", `${numerator}/${d1} ÷ ${divisorNumerator}/${d1} = ？`, integer, "同分母分數相除，分母可約去。", `${numerator} ÷ ${divisorNumerator} = ${integer}。`),
      () => result(operationKey, "input", `${numerator}/${d1} ÷ □/${d1} = ${integer}，□ 是多少？`, divisorNumerator, "同分母時用分子反推。", `${numerator} ÷ ${integer} = ${divisorNumerator}。`),
      () => result(operationKey, "input", `${v.person}有 ${numerator}/${d1} 公升果汁，每杯裝 ${divisorNumerator}/${d1} 公升，可以裝滿幾杯？`, integer, "總量除以每杯容量。", `${numerator}/${d1} ÷ ${divisorNumerator}/${d1} = ${integer}。`)
    );
  }
  if (topic === "異分母分數除法") {
    const numerator = integer * v.b;
    const divisorNumerator = v.b;
    const answer = frac(numerator * d2, d1 * divisorNumerator);
    return complexity(
      difficulty,
      () => result(operationKey, "input", `${numerator}/${d1} ÷ ${divisorNumerator}/${d2} = ？（兩分母不同）`, answer, "除以分數要乘以倒數。", `${numerator}/${d1} × ${d2}/${divisorNumerator} = ${answer}。`),
      () => result(operationKey, "input", `□ ÷ ${divisorNumerator}/${d2} = ${answer}，原分數的分母是 ${d1}，分子是多少？`, numerator, "商乘除數還原被除數。", `${answer} × ${divisorNumerator}/${d2} = ${frac(numerator, d1)}。`),
      () => {
        return result(operationKey, "input", `${v.person}有 ${frac(numerator, d1)} 公斤麵粉，每份用 ${frac(divisorNumerator, d2)} 公斤，可以分成幾份？`, answer, "總重量除以每份重量。", `${frac(numerator, d1)} ÷ ${frac(divisorNumerator, d2)} = ${answer}。`);
      }
    );
  }
  if (topic === "帶分數除法") {
    const wholeNumerator = d1 * integer + v.b;
    const divisor = v.b;
    const answer = frac(wholeNumerator, d1 * divisor);
    const mixedText = mixed(wholeNumerator, d1);
    return complexity(
      difficulty,
      () => result(operationKey, "input", `${mixedText} ÷ ${divisor} = ？`, answer, "先把帶分數化成假分數。", `帶分數 ${mixedText} 化為假分數 ${wholeNumerator}/${d1}，再除以 ${divisor} 得 ${answer}。`),
      () => result(operationKey, "input", `某帶分數 ÷ ${divisor} = ${answer}，原帶分數的整數部分是多少？`, integer, "先以商乘除數還原假分數。", `${answer} × ${divisor} = ${wholeNumerator}/${d1} = ${mixedText}。`),
      () => result(operationKey, "input", `${v.person}把 ${mixedText} 公尺緞帶平均分成 ${divisor} 份，每份長多少公尺？`, answer, "先把帶分數化成假分數，再除以份數。", `${mixedText} ÷ ${divisor} = ${answer}。`)
    );
  }
  if (topic === "商的意義") {
    const total = integer * v.b;
    return complexity(
      difficulty,
      () => result(operationKey, "input", `${total} 個${v.object}平均分成 ${v.b} 份，每份幾個？`, integer, "這是求每一份有多少的等分除。", `${total} ÷ ${v.b} = ${integer}。`),
      () => result(operationKey, "input", `${total} 個${v.object}，每 ${integer} 個裝一份，可裝幾份？`, v.b, "這是求包含幾份的包含除。", `${total} ÷ ${integer} = ${v.b}。`),
      () => result(operationKey, "input", `${v.person}把 ${total} 個${v.object}每 ${integer} 個裝一盒，送出 2 盒後還有幾盒？`, v.b - 2, "先求可裝盒數，再減送出的盒數。", `${total} ÷ ${integer} - 2 = ${v.b - 2}。`)
    );
  }
  const total = integer * v.b;
  return complexity(
    difficulty,
    () => result(operationKey, "input", `${total}/${d1} 公斤平均分成 ${v.b} 份，一份（單位量）是多少公斤？`, frac(integer, d1), "總量除以份數就是單位量。", `${total}/${d1} ÷ ${v.b} = ${frac(integer, d1)}。`),
    () => result(operationKey, "input", `每份 ${integer}/${d1} 公斤，共有 ${v.b} 份，總量分子是多少？`, total, "單位量乘份數可還原總量。", `${integer}/${d1} × ${v.b} = ${total}/${d1}。`),
    () => result(operationKey, "input", `${v.person}有 ${total}/${d1} 公斤的${v.object}，每份裝 ${integer}/${d1} 公斤，可以裝成幾份？`, v.b, "用總重量除以每份重量，求包含幾個單位量。", `${total}/${d1} ÷ ${integer}/${d1} = ${v.b}。`)
  );
}

function relationGenerator(topic, operationKey, difficulty, variant, v) {
  const step = v.b;
  const start = v.n;
  const position = v.c + 2;
  if (topic === "間隔問題") {
    const intervals = v.n;
    return complexity(
      difficulty,
      () => result(operationKey, "input", `長 ${intervals * step} 公尺直線每隔 ${step} 公尺放一盆花，兩端都放，共幾盆？`, intervals + 1, "直線兩端都放，物件數比間隔數多 1。", `${intervals * step} ÷ ${step} + 1 = ${intervals + 1}。`),
      () => result(operationKey, "input", `直線兩端都有標誌，共 ${intervals + 1} 個、相鄰標誌間距 ${step} 公尺，全長多少公尺？`, intervals * step, "先用標誌數減 1 求間隔數。", `(${intervals + 1} - 1) × ${step} = ${intervals * step}。`),
      () => result(operationKey, "input", `${v.person}沿${v.place}的封閉步道每隔 ${step} 公尺放 1 個標誌，共放 ${intervals} 個。沿步道走兩圈共幾公尺？`, intervals * step * 2, "封閉路線的標誌數等於間隔數，先算一圈長度，再乘 2。", `${intervals} × ${step} × 2 = ${intervals * step * 2}。`)
    );
  }
  if (topic === "和不變" || topic === "差不變" || topic === "積不變" || topic === "商不變") {
    const second = v.n + v.b;
    const sum = v.n + second;
    const difference = second - v.n;
    const product = v.n * second;
    const quotientDividend = v.n * second;
    const direct = { 和不變: sum, 差不變: difference, 積不變: product, 商不變: v.n }[topic];
    const expression = {
      和不變: `${v.n} + ${second} 中，第一數加 ${step}、第二數減 ${step}`,
      差不變: `${second} - ${v.n} 中，兩數都加 ${step}`,
      積不變: `${v.n} × ${second} 中，第一數乘 ${step}、第二數除以 ${step}`,
      商不變: `${quotientDividend} ÷ ${second} 中，兩數都乘 ${step}`,
    }[topic];
    return complexity(
      difficulty,
      () => result(operationKey, "input", `${expression}，結果是多少？`, direct, `依${topic}規律同時調整兩數。`, `調整前後${topic}，答案是 ${direct}。`),
      () => result(operationKey, "input", `${topic}反推：原結果是 ${direct}，調整後其中一數是 ${v.n + step}；調整量是多少？`, step, "比較調整前後同一個數。", `${v.n + step} - ${v.n} = ${step}。`),
      () => result(operationKey, "input", `${expression}。若要保持${topic}，被調整的兩個數必須分別如何改變？請填調整量。`, step, `辨認${topic}成立時兩數的對應變化。`, `兩數的對應調整量都是 ${step}，才能保持${topic}。`)
    );
  }
  const term = start + step * position;
  const figureWord = topic === "圖形規律" ? "第幾個圖形的積木數" : "第幾項";
  return complexity(
    difficulty,
    () => result(operationKey, "input", `${topic}：從 ${start} 開始，每次增加 ${step}，${figureWord} ${position + 1} 是多少？`, term, "首項加上固定增加量乘間隔數。", `${start} + ${step} × ${position} = ${term}。`),
    () => result(operationKey, "input", `${topic}反推：第 ${position + 1} 項是 ${term}，每次增加 ${step}，首項是多少？`, start, "末項扣掉所有增加量。", `${term} - ${step} × ${position} = ${start}。`),
    () => result(operationKey, "input", `${v.person}依${topic}排${v.object}，第 ${position} 項有 ${term - step} 個，第 ${position + 1} 項有 ${term} 個，兩項合計多少？`, term * 2 - step, "先找相鄰兩項，再相加。", `${term - step} + ${term} = ${term * 2 - step}。`)
  );
}

function decimalGenerator(topic, operationKey, difficulty, variant, v) {
  const integer = v.n;
  const divisorInteger = v.b;
  const decimalDivisor = round(v.b / 10);
  const quotient = round(v.n / 10);
  if (topic === "整數除以小數") {
    const answer = integer * 10 / v.b;
    return decimalDivisionSet(topic, operationKey, difficulty, v, integer, decimalDivisor, answer);
  }
  if (topic === "小數除以整數") {
    const dividend = round(quotient * divisorInteger);
    return decimalDivisionSet(topic, operationKey, difficulty, v, dividend, divisorInteger, quotient);
  }
  if (topic === "小數除以小數") {
    const dividend = round(quotient * decimalDivisor);
    return decimalDivisionSet(topic, operationKey, difficulty, v, dividend, decimalDivisor, quotient);
  }
  if (topic === "商的小數點") {
    const dividend = round(quotient * divisorInteger);
    return complexity(
      difficulty,
      () => result(operationKey, "input", `${dividend} ÷ ${divisorInteger} 的商，小數點後第一位數字是多少？`, Math.floor(quotient * 10) % 10, "商的小數點要與被除數補 0 後的位置對齊。", `${dividend} ÷ ${divisorInteger} = ${quotient}。`),
      () => result(operationKey, "input", `□ ÷ ${divisorInteger} = ${quotient}，□ 的小數點後第一位數字是多少？`, Math.floor(dividend * 10) % 10, "先用商乘除數還原被除數。", `${quotient} × ${divisorInteger} = ${dividend}。`),
      () => result(operationKey, "input", `${v.person}算出 ${dividend} ÷ ${divisorInteger} = ${quotient}，再把商乘 10 檢查小數點，結果是多少？`, quotient * 10, "先完成除法，再乘 10。", `${quotient} × 10 = ${quotient * 10}。`)
    );
  }
  if (topic === "估算") {
    const dividend = v.n * 10 + v.b;
    return complexity(
      difficulty,
      () => result(operationKey, "input", `把 ${dividend} 估成最接近的整十數後除以 10，估商是多少？`, Math.round(dividend / 10), "先四捨五入到整十數。", `${dividend} 約為 ${Math.round(dividend / 10) * 10}，估商 ${Math.round(dividend / 10)}。`),
      () => result(operationKey, "input", `把被除數 ${dividend} 估成 ${Math.round(dividend / 10) * 10} 後計算；原數與估計數相差多少？`, Math.abs(dividend - Math.round(dividend / 10) * 10), "比較原數與最接近的整十數。", `|${dividend} - ${Math.round(dividend / 10) * 10}| = ${Math.abs(dividend - Math.round(dividend / 10) * 10)}。`),
      () => result(operationKey, "input", `${v.person}帶 ${dividend} 元，每件約 10 元。不做精算時，估計最多可買幾件？`, Math.round(dividend / 10), "把總金額估成最接近的整十數，再除以 10。", `${dividend} 約為 ${Math.round(dividend / 10) * 10}，估計可買 ${Math.round(dividend / 10)} 件。`)
    );
  }
  if (topic === "除法關係") {
    const dividend = round(quotient * divisorInteger);
    return decimalDivisionSet(topic, operationKey, difficulty, v, dividend, divisorInteger, quotient);
  }
  const total = round(quotient * divisorInteger);
  return complexity(
    difficulty,
    () => result(operationKey, "input", `${total} 公斤平均分成 ${divisorInteger} 份，每份幾公斤？`, quotient, "總量除以份數。", `${total} ÷ ${divisorInteger} = ${quotient}。`),
    () => result(operationKey, "input", `每份 ${quotient} 公斤，共 ${divisorInteger} 份，總量多少公斤？`, total, "每份量乘份數。", `${quotient} × ${divisorInteger} = ${total}。`),
    () => result(operationKey, "input", `${v.person}把 ${total} 公斤餅乾平均分成 ${divisorInteger} 份，每份重多少公斤？`, quotient, "總重量除以份數。", `${total} ÷ ${divisorInteger} = ${quotient}。`)
  );
}

function decimalDivisionSet(topic, operationKey, difficulty, v, dividend, divisor, quotient) {
  const bottleCount = v.n + v.b;
  const applicationTotal = round(divisor * bottleCount);
  return complexity(
    difficulty,
    () => result(operationKey, "input", `${topic}：${dividend} ÷ ${divisor} = ？`, quotient, "同時移動被除數與除數的小數點，直到除數為整數。", `${dividend} ÷ ${divisor} = ${quotient}。`),
    () => result(operationKey, "input", `${topic}反推：□ ÷ ${divisor} = ${quotient}，□ 是多少？`, dividend, "商乘除數可還原被除數。", `${quotient} × ${divisor} = ${dividend}。`),
    () => result(operationKey, "input", `${v.person}有 ${applicationTotal} 公升果汁，每瓶裝 ${divisor} 公升，可以裝滿幾瓶？`, bottleCount, "果汁總量除以每瓶容量。", `${applicationTotal} ÷ ${divisor} = ${bottleCount}。`)
  );
}

function ratioGenerator(topic, operationKey, difficulty, variant, v) {
  const first = v.n;
  const second = v.b + 1;
  const factor = v.c;
  if (topic === "比的記法") {
    return complexity(
      difficulty,
      () => result(operationKey, "input", `${first} 個紅球和 ${second} 個藍球記成 ${first}：${second}，前項是多少？`, first, "冒號前是前項。", `比的前項是 ${first}。`),
      () => result(operationKey, "input", `某比的前項是 ${first}、後項是 ${second}，兩項的和是多少？`, first + second, "先依比的記法辨認兩項。", `${first} + ${second} = ${first + second}。`),
      () => result(operationKey, "input", `${v.person}有 ${first} 張貼紙和 ${second} 張卡片，寫成「貼紙數：卡片數」時，前項是多少？`, first, "比號前面的數是前項。", `貼紙數在比號前，所以前項是 ${first}。`)
    );
  }
  if (topic === "比值") {
    const value = round(first / second);
    return complexity(
      difficulty,
      () => result(operationKey, "input", `${first}：${second} 的比值是多少？（取到小數第 2 位）`, value, "比值是前項除以後項。", `${first} ÷ ${second} = ${value}。`),
      () => result(operationKey, "input", `某比的比值是 ${first}，後項是 ${second}，前項是多少？`, first * second, "前項 = 比值 × 後項。", `${first} × ${second} = ${first * second}。`),
      () => result(operationKey, "input", `${v.person}以 ${first}：${second} 混合兩種果汁，前項有 ${first * factor} 杯時，後項有幾杯？`, second * factor, "先由前項求放大倍數，再算後項。", `${first * factor} ÷ ${first} = ${factor}，${second} × ${factor} = ${second * factor}。`)
    );
  }
  if (topic === "比的化簡") {
    if (variant === 1) {
      return complexity(
        difficulty,
        () => result(operationKey, "input", `${round(first / 10)}：${round(second / 10)} 同乘 10 化為整數比後，兩項和是多少？`, first + second, "小數比兩項同乘 10。", `${round(first / 10)}：${round(second / 10)} = ${first}：${second}，和為 ${first + second}。`),
        () => result(operationKey, "input", `小數比化簡後是 ${first}：${second}，兩項原本都除以 10；原小數前項是多少？`, round(first / 10), "把整數比的前項除以 10。", `${first} ÷ 10 = ${round(first / 10)}。`),
        () => result(operationKey, "input", `${v.person}把小數比 ${round(first / 10)}：${round(second / 10)} 化成整數比，化簡後兩項的和是多少？`, first + second, "兩項同乘 10 後，再求整數比兩項和。", `${first} + ${second} = ${first + second}。`)
      );
    }
    if (variant === 2) {
      return complexity(
        difficulty,
        () => result(operationKey, "input", `${first}/${factor}：${second}/${factor} 同乘 ${factor} 化為整數比後，兩項和是多少？`, first + second, "分數比兩項同乘共同分母。", `化為 ${first}：${second}，和為 ${first + second}。`),
        () => result(operationKey, "input", `分數比化簡後是 ${first}：${second}，共同分母為 ${factor}；原分數前項的分子是多少？`, first, "同乘共同分母後，整數前項就是原分子。", `原分數前項是 ${first}/${factor}。`),
        () => result(operationKey, "input", `${v.person}把 ${first}/${factor}：${second}/${factor} 化為整數比，化簡後兩項的和是多少？`, first + second, "兩項同乘共同分母，再求和。", `${first} + ${second} = ${first + second}。`)
      );
    }
  }
  if (topic === "連比") {
    const third = v.c + 2;
    return complexity(
      difficulty,
      () => result(operationKey, "input", `甲：乙：丙 = ${first}：${second}：${third}，三項和是多少？`, first + second + third, "連比有三個量。", `${first} + ${second} + ${third} = ${first + second + third}。`),
      () => result(operationKey, "input", `甲：乙：丙 = ${first}：${second}：${third}，甲放大 ${factor} 倍時，丙是多少？`, third * factor, "三項必須同乘相同倍數。", `${third} × ${factor} = ${third * factor}。`),
      () => result(operationKey, "input", `${v.person}按 ${first}：${second}：${third} 分三份${v.object}，第一份 ${first * factor} 個，三份共幾個？`, (first + second + third) * factor, "先求倍率，再乘連比三項和。", `倍率 ${factor}，總數 (${first} + ${second} + ${third}) × ${factor} = ${(first + second + third) * factor}。`)
    );
  }
  const common = gcd(first, second);
  const simpleFirst = first / common;
  const simpleSecond = second / common;
  return complexity(
    difficulty,
    () => result(operationKey, "input", `${first * factor}：${second * factor} 化簡後，兩項和是多少？`, simpleFirst + simpleSecond, "兩項同除以最大公因數。", `化簡為 ${simpleFirst}：${simpleSecond}，和為 ${simpleFirst + simpleSecond}。`),
    () => result(operationKey, "input", `${simpleFirst}：${simpleSecond} = ${simpleFirst * factor}：□，□ 是多少？`, simpleSecond * factor, "兩項同乘相同倍數。", `${simpleSecond} × ${factor} = ${simpleSecond * factor}。`),
    () => result(operationKey, "input", `${v.person}按最簡比 ${simpleFirst}：${simpleSecond} 調製兩種果汁，第一種用了 ${simpleFirst * factor} 杯，兩種共用了幾杯？`, (simpleFirst + simpleSecond) * factor, "先求倍率，再乘兩項和。", `(${simpleFirst} + ${simpleSecond}) × ${factor} = ${(simpleFirst + simpleSecond) * factor}。`)
  );
}

function circleGenerator(topic, operationKey, difficulty, variant, v) {
  const radius = v.n;
  const diameter = radius * 2;
  const circumference = round(diameter * 3.14);
  const area = round(radius * radius * 3.14);
  const fractionOfCircle = [2, 4, 8][variant];
  if (topic === "圓周率") {
    return complexity(
      difficulty,
      () => result(operationKey, "input", `圓周長 ${circumference} 公分 ÷ 直徑 ${diameter} 公分，比值是多少？`, 3.14, "圓周率 = 圓周長 ÷ 直徑。", `${circumference} ÷ ${diameter} = 3.14。`),
      () => result(operationKey, "input", `圓周長 ÷ 直徑 = 3.14，直徑 ${diameter} 公分時，圓周長多少公分？`, circumference, "圓周長 = 圓周率 × 直徑。", `3.14 × ${diameter} = ${circumference}。`),
      () => result(operationKey, "input", `直徑 ${diameter} 公分的輪子完整滾動 2 圈，共前進多少公分？`, round(circumference * 2), "一圈前進一個圓周長，先求周長再乘圈數。", `${diameter} × 3.14 × 2 = ${round(circumference * 2)}。`)
    );
  }
  if (topic === "直徑與半徑") {
    return complexity(
      difficulty,
      () => result(operationKey, "input", `半徑 ${radius} 公分，直徑多少公分？`, diameter, "直徑是半徑的 2 倍。", `${radius} × 2 = ${diameter}。`),
      () => result(operationKey, "input", `直徑 ${diameter} 公分，半徑多少公分？`, radius, "半徑是直徑的一半。", `${diameter} ÷ 2 = ${radius}。`),
      () => result(operationKey, "input", `${v.person}畫兩個半徑 ${radius} 公分的圓，兩個直徑長度合計多少公分？`, diameter * 2, "先由半徑求一個直徑，再乘 2。", `${radius} × 2 × 2 = ${diameter * 2}。`)
    );
  }
  if (topic === "反推半徑") {
    return complexity(
      difficulty,
      () => result(operationKey, "input", `由圓周長反推半徑：圓周長 ${circumference} 公分，半徑多少公分？（π 取 3.14）`, radius, "圓周長除以 3.14 得直徑，再除以 2。", `${circumference} ÷ 3.14 ÷ 2 = ${radius}。`),
      () => result(operationKey, "input", `由圓面積反推半徑：圓面積 ${area} 平方公分，半徑多少公分？（π 取 3.14）`, radius, "面積除以 3.14 後開平方。", `${area} ÷ 3.14 = ${radius * radius}，半徑是 ${radius}。`),
      () => result(operationKey, "input", `${v.person}量得圓周長 ${circumference} 公分，這個圓的半徑是多少公分？`, radius, "先由周長除以 3.14 求直徑，再除以 2。", `${circumference} ÷ 3.14 ÷ 2 = ${radius}。`)
    );
  }
  if (topic === "扇形弧長" || topic === "扇形周長") {
    const arc = round(circumference / fractionOfCircle);
    const perimeter = round(arc + radius * 2);
    const isPerimeter = topic === "扇形周長";
    return complexity(
      difficulty,
      () => result(operationKey, "input", `半徑 ${radius} 公分的 1/${fractionOfCircle} 圓${isPerimeter ? "扇形周長" : "弧長"}是多少公分？`, isPerimeter ? perimeter : arc, isPerimeter ? "弧長加兩條半徑。" : "整圓周長乘扇形比例。", isPerimeter ? `${arc} + ${radius} × 2 = ${perimeter}。` : `${circumference} ÷ ${fractionOfCircle} = ${arc}。`),
      () => result(operationKey, "input", `1/${fractionOfCircle} 圓弧長 ${arc} 公分，整圓周長多少公分？`, circumference, "弧長乘份數還原整圓。", `${arc} × ${fractionOfCircle} = ${circumference}。`),
      () => result(operationKey, "input", `${v.person}沿半徑 ${radius} 公分的 1/${fractionOfCircle} 圓扇形邊界走 2 圈，共走多少公分？`, perimeter * 2, "先算弧長加兩半徑，再乘 2 圈。", `(${arc} + ${radius} × 2) × 2 = ${perimeter * 2}。`)
    );
  }
  return complexity(
    difficulty,
    () => result(operationKey, "input", `直徑 ${diameter} 公分的圓，周長多少公分？（π 取 3.14）`, circumference, "圓周長 = 直徑 × 3.14。", `${diameter} × 3.14 = ${circumference}。`),
    () => result(operationKey, "input", `圓周長 ${circumference} 公分，直徑多少公分？（π 取 3.14）`, diameter, "直徑 = 圓周長 ÷ 3.14。", `${circumference} ÷ 3.14 = ${diameter}。`),
    () => result(operationKey, "input", `${v.person}繞直徑 ${diameter} 公尺的圓形花圃走 2 圈，共走多少公尺？`, circumference * 2, "先求一圈周長，再乘圈數。", `${diameter} × 3.14 × 2 = ${circumference * 2}。`)
  );
}

function areaGenerator(topic, operationKey, difficulty, variant, v) {
  const radius = v.n;
  const area = round(radius * radius * 3.14);
  const divisor = [2, 4, 8][variant];
  if (topic === "反推半徑") {
    return complexity(
      difficulty,
      () => result(operationKey, "input", `圓面積 ${area} 平方公分，半徑是多少公分？（π 取 3.14）`, radius, "面積除以 3.14 後開平方。", `${area} ÷ 3.14 = ${radius * radius}，半徑是 ${radius}。`),
      () => result(operationKey, "input", `半徑平方是 ${radius * radius}，正的半徑是多少公分？`, radius, "半徑取正值。", `${radius} × ${radius} = ${radius * radius}。`),
      () => result(operationKey, "input", `${v.person}量得圓面積 ${area} 平方公分，這個圓的半徑是多少公分？`, radius, "面積除以 3.14 得到半徑平方，再找平方根。", `${area} ÷ 3.14 = ${radius * radius}，所以半徑是 ${radius}。`)
    );
  }
  if (topic === "半徑平方") {
    return complexity(
      difficulty,
      () => result(operationKey, "input", `半徑 ${radius} 公分，半徑平方是多少？`, radius * radius, "半徑乘半徑。", `${radius} × ${radius} = ${radius * radius}。`),
      () => result(operationKey, "input", `半徑平方是 ${radius * radius}，半徑是多少？`, radius, "找出平方後為題目數字的正數。", `${radius} × ${radius} = ${radius * radius}。`),
      () => result(operationKey, "input", `兩圓半徑分別為 ${radius} 與 ${radius + 1} 公分，半徑平方相差多少？`, (radius + 1) ** 2 - radius ** 2, "先算兩個平方，再相減。", `${(radius + 1) ** 2} - ${radius ** 2} = ${(radius + 1) ** 2 - radius ** 2}。`)
    );
  }
  if (topic === "扇形面積" || topic === "半圓面積") {
    const part = topic === "半圓面積" ? round(area / 2) : round(area / divisor);
    const parts = topic === "半圓面積" ? 2 : divisor;
    return complexity(
      difficulty,
      () => result(operationKey, "input", `半徑 ${radius} 公分的 1/${parts} 圓面積是多少？（π 取 3.14）`, part, "先求整圓面積，再除以份數。", `${radius} × ${radius} × 3.14 ÷ ${parts} = ${part}。`),
      () => result(operationKey, "input", `1/${parts} 圓面積 ${part} 平方公分，整圓面積多少？`, round(part * parts), "部分面積乘份數。", `${part} × ${parts} = ${round(part * parts)}。`),
      () => result(operationKey, "input", `${v.person}鋪半徑 ${radius} 公尺的 1/${parts} 圓形區域，面積是多少平方公尺？`, part, "先求完整圓面積，再除以所占份數。", `${area} ÷ ${parts} = ${part}。`)
    );
  }
  if (topic === "組合圖形") {
    const smallRadius = radius - 1;
    const smallArea = round(smallRadius * smallRadius * 3.14);
    return complexity(
      difficulty,
      () => result(operationKey, "input", `半徑 ${radius} 與 ${smallRadius} 公分的兩圓面積相加是多少？（π 取 3.14）`, round(area + smallArea), "分別求兩圓面積再相加。", `${area} + ${smallArea} = ${round(area + smallArea)}。`),
      () => result(operationKey, "input", `大圓面積 ${area}、小圓面積 ${smallArea} 平方公分，環形面積是多少？`, round(area - smallArea), "大圓面積減小圓面積。", `${area} - ${smallArea} = ${round(area - smallArea)}。`),
      () => result(operationKey, "input", `${v.person}從面積 ${area} 平方公尺的大圓挖去面積 ${smallArea} 平方公尺的小圓，剩下的環形面積是多少平方公尺？`, round(area - smallArea), "環形面積 = 大圓面積 - 小圓面積。", `${area} - ${smallArea} = ${round(area - smallArea)}。`)
    );
  }
  return complexity(
    difficulty,
    () => result(operationKey, "input", `半徑 ${radius} 公分的圓面積是多少？（π 取 3.14）`, area, "圓面積 = 半徑 × 半徑 × 3.14。", `${radius} × ${radius} × 3.14 = ${area}。`),
    () => result(operationKey, "input", `圓面積 ${area} 平方公分，面積除以 3.14 後是多少？`, radius * radius, "先反推半徑平方。", `${area} ÷ 3.14 = ${radius * radius}。`),
    () => result(operationKey, "input", `${v.person}要鋪半徑 ${radius} 公尺的圓形區域，需要鋪多少平方公尺？`, area, "圓面積 = 半徑 × 半徑 × 3.14。", `${radius} × ${radius} × 3.14 = ${area}。`)
  );
}

function speedGenerator(topic, operationKey, difficulty, variant, v) {
  const speed = v.n + 10;
  const time = v.b;
  const distance = speed * time;
  if (topic === "時速換算" || topic === "分速換算" || topic === "秒速換算") {
    const unit = topic === "時速換算" ? "小時" : topic === "分速換算" ? "分鐘" : "秒";
    const conversion = topic === "時速換算" ? 60 : topic === "分速換算" ? 60 : 60;
    const target = topic === "時速換算" ? "分鐘" : topic === "分速換算" ? "秒" : "分鐘";
    const extra = v.n;
    const converted = topic === "秒速換算"
      ? round((time * 60 + extra) / conversion)
      : time * conversion + extra;
    return complexity(
      difficulty,
      () => result(operationKey, "input", `每${unit}走 ${speed} 公尺，${time} ${unit}走多少公尺？`, distance, "距離 = 速率 × 時間。", `${speed} × ${time} = ${distance}。`),
      () => result(operationKey, "input", topic === "秒速換算"
        ? `${time * 60} 秒再加 ${extra} 秒，合計多少分鐘？（取到小數第 2 位）`
        : `${time} ${unit}再加 ${extra} ${target}，合計多少${target}？`,
      converted,
      topic === "秒速換算" ? "先合併秒數，再除以 60。" : `先把${unit}換成${target}，再加剩餘${target}。`,
      topic === "秒速換算"
        ? `(${time * 60} + ${extra}) ÷ 60 = ${converted}（分鐘）。`
        : `${time} × 60 + ${extra} = ${converted}（${target}）。`),
      () => result(operationKey, "input", `${v.person}以每${unit} ${speed} 公尺前進 ${time} ${unit}，再前進 ${speed} 公尺，共走多少？`, distance + speed, "先用速率乘時間，再加第二段距離。", `${speed} × ${time} + ${speed} = ${distance + speed}。`)
    );
  }
  if (topic === "距離") {
    return complexity(
      difficulty,
      () => result(operationKey, "input", `時速 ${speed} 公里行駛 ${time} 小時，距離多少公里？`, distance, "距離 = 速率 × 時間。", `${speed} × ${time} = ${distance}。`),
      () => result(operationKey, "input", `行駛 ${distance} 公里用了 ${time} 小時，時速多少公里？`, speed, "速率 = 距離 ÷ 時間。", `${distance} ÷ ${time} = ${speed}。`),
      () => result(operationKey, "input", `${v.person}先以時速 ${speed} 公里走 ${time} 小時，再走 ${speed + 5} 公里，共走多少？`, distance + speed + 5, "先算第一段距離，再加第二段。", `${speed} × ${time} + ${speed + 5} = ${distance + speed + 5}。`)
    );
  }
  if (topic === "時間") {
    return complexity(
      difficulty,
      () => result(operationKey, "input", `距離 ${distance} 公里、時速 ${speed} 公里，需要幾小時？`, time, "時間 = 距離 ÷ 速率。", `${distance} ÷ ${speed} = ${time}。`),
      () => result(operationKey, "input", `走了 ${time} 小時、時速 ${speed} 公里，距離多少公里？`, distance, "距離 = 速率 × 時間。", `${speed} × ${time} = ${distance}。`),
      () => result(operationKey, "input", `${v.person}預計走 ${time + 2} 小時，已走 ${distance} 公里且時速 ${speed} 公里，還剩幾小時？`, 2, "先由距離和速率求已用時間，再扣總時間。", `${time + 2} - ${distance} ÷ ${speed} = 2。`)
    );
  }
  const secondSpeed = speed + 6;
  const secondTime = v.c;
  const totalDistance = distance + secondSpeed * secondTime;
  const totalTime = time + secondTime;
  if (topic === "平均速率") {
    return complexity(
      difficulty,
      () => result(operationKey, "input", `總距離 ${distance} 公里、總時間 ${time} 小時，平均速率多少？`, speed, "平均速率 = 總距離 ÷ 總時間。", `${distance} ÷ ${time} = ${speed}。`),
      () => result(operationKey, "input", `平均速率 ${speed} 公里/時、總時間 ${time} 小時，總距離多少？`, distance, "總距離 = 平均速率 × 總時間。", `${speed} × ${time} = ${distance}。`),
      () => result(operationKey, "input", `第一段以 ${speed} 公里/時走 ${time} 小時，第二段以 ${secondSpeed} 公里/時走 ${secondTime} 小時，全程平均速率多少？（取到小數第2位）`, round(totalDistance / totalTime), "先加總兩段距離與時間，再相除。", `(${distance} + ${secondSpeed * secondTime}) ÷ (${time} + ${secondTime}) = ${round(totalDistance / totalTime)}。`)
    );
  }
  return complexity(
    difficulty,
    () => result(operationKey, "input", `${distance} 公里用 ${time} 小時，速率是多少公里/時？`, speed, "速率 = 距離 ÷ 時間。", `${distance} ÷ ${time} = ${speed}。`),
    () => result(operationKey, "input", `速率 ${speed} 公里/時、時間 ${time} 小時，反推距離多少？`, distance, "距離 = 速率 × 時間。", `${speed} × ${time} = ${distance}。`),
    () => result(operationKey, "input", `${v.person}先以 ${speed} 公里/時走 ${time} 小時，再以 ${secondSpeed} 公里/時走 1 小時，總距離多少？`, distance + secondSpeed, "分別求兩段距離再相加。", `${speed} × ${time} + ${secondSpeed} = ${distance + secondSpeed}。`)
  );
}

function scaleGenerator(topic, operationKey, difficulty, variant, v) {
  const factor = v.b;
  const original = v.n * factor;
  if (topic === "放大圖" || topic === "縮圖" || topic === "面積變化") {
    const shrink = topic === "縮圖";
    const changed = shrink ? original / factor : original * factor;
    const areaFactor = factor * factor;
    if (topic === "面積變化") {
      const baseArea = v.n * v.n;
      const changedArea = baseArea * areaFactor;
      return complexity(
        difficulty,
        () => result(operationKey, "input", `原正方形邊長 ${v.n} 公分；邊長放大 ${factor} 倍時，面積變為原來幾倍？`, areaFactor, "面積倍率是邊長倍率的平方。", `${factor} × ${factor} = ${areaFactor}。`),
        () => result(operationKey, "input", `原面積 ${baseArea} 平方公分，放大後面積 ${changedArea} 平方公分；邊長放大幾倍？`, factor, "先求面積倍率，再開平方得到邊長倍率。", `${changedArea} ÷ ${baseArea} = ${areaFactor}，${factor} × ${factor} = ${areaFactor}。`),
        () => result(operationKey, "input", `原正方形面積 ${original * original} 平方公分，邊長放大 ${factor} 倍後，新面積是多少？`, original * original * areaFactor, "先求面積倍率，再乘原面積。", `${original * original} × ${areaFactor} = ${original * original * areaFactor}。`)
      );
    }
    return complexity(
      difficulty,
      () => result(operationKey, "input", `原邊長 ${original} 公分，${topic}邊長倍率為 ${shrink ? `1/${factor}` : factor}，新邊長多少？`, changed, shrink ? "原邊長除以縮小倍率。" : "原邊長乘放大倍率。", `${original} ${shrink ? "÷" : "×"} ${factor} = ${changed}。`),
      () => result(operationKey, "input", `${topic}後邊長 ${changed} 公分，倍率為 ${shrink ? `1/${factor}` : factor}，原邊長多少？`, original, "將縮放運算反過來。", `原邊長是 ${original} 公分。`),
      () => result(operationKey, "input", `正方形原邊長 ${original} 公分，做${topic}後邊長 ${changed} 公分，新圖面積多少？`, changed * changed, "先完成邊長縮放，再用邊長乘邊長。", `${changed} × ${changed} = ${changed * changed}。`)
    );
  }
  if (topic === "長度換算") {
    return complexity(
      difficulty,
      () => result(operationKey, "input", `${v.n * 100} 公分是多少公尺？`, v.n, "100 公分 = 1 公尺。", `${v.n * 100} ÷ 100 = ${v.n}。`),
      () => result(operationKey, "input", `${v.n} 公里是多少公尺？`, v.n * 1000, "1 公里 = 1000 公尺。", `${v.n} × 1000 = ${v.n * 1000}。`),
      () => result(operationKey, "input", `${v.person}先走 ${v.n} 公尺，再走 ${v.b * 100} 公分，合計多少公尺？`, v.n + v.b, "先把公分換成公尺，再相加。", `${v.b * 100} 公分 = ${v.b} 公尺，合計 ${v.n + v.b} 公尺。`)
    );
  }
  const scale = factor * 100;
  const map = v.n;
  const real = map * scale;
  if (topic === "圖上距離") {
    return complexity(
      difficulty,
      () => result(operationKey, "input", `比例尺 1：${scale}，實際 ${real} 公分，圖上距離多少公分？`, map, "圖上距離 = 實際距離 ÷ 比例尺後項。", `${real} ÷ ${scale} = ${map}。`),
      () => result(operationKey, "input", `圖上 ${map} 公分代表實際 ${real} 公分，比例尺後項是多少？`, scale, "實際距離除以圖上距離。", `${real} ÷ ${map} = ${scale}。`),
      () => result(operationKey, "input", `兩段實際距離各 ${real} 與 ${scale} 公分，比例尺 1：${scale}，圖上合計多少公分？`, map + 1, "先加實際距離，再除比例尺後項。", `(${real} + ${scale}) ÷ ${scale} = ${map + 1}。`)
    );
  }
  if (topic === "實際距離") {
    return complexity(
      difficulty,
      () => result(operationKey, "input", `比例尺 1：${scale}，圖上 ${map} 公分，實際距離多少公分？`, real, "實際距離 = 圖上距離 × 比例尺後項。", `${map} × ${scale} = ${real}。`),
      () => result(operationKey, "input", `實際 ${real} 公分、圖上 ${map} 公分，比例尺後項是多少？`, scale, "實際距離除以圖上距離。", `${real} ÷ ${map} = ${scale}。`),
      () => result(operationKey, "input", `地圖兩段各 ${map} 與 ${factor} 公分，比例尺 1：${scale}，實際總長多少公分？`, (map + factor) * scale, "先加圖上距離，再乘比例尺。", `(${map} + ${factor}) × ${scale} = ${(map + factor) * scale}。`)
    );
  }
  return complexity(
    difficulty,
    () => result(operationKey, "input", `比例尺 1：${scale} 的地圖上，${map} 公分代表實際 ${real} 公分。圖上 1 公分代表實際多少公分？`, scale, "比例尺後項就是圖上 1 公分代表的實際距離。", `圖上 1 公分代表實際 ${scale} 公分。`),
    () => result(operationKey, "input", `圖上 ${map} 公分代表實際 ${real} 公分，比例尺是 1：多少？`, scale, "實際距離除以圖上距離。", `${real} ÷ ${map} = ${scale}。`),
    () => result(operationKey, "input", `${v.person}在${v.place}地圖量兩段路，各 ${map} 與 ${factor} 公分，比例尺 1：${scale}，實際總長多少公分？`, (map + factor) * scale, "先加圖上兩段距離，再乘比例尺後項。", `(${map} + ${factor}) × ${scale} = ${(map + factor) * scale}。`)
  );
}

function generatorFor(stage, topic) {
  if (["質數與合數", "質因數分解", "公因數", "最大公因數", "公倍數", "最小公倍數", "短除法"].includes(topic)) return factorGenerator;
  if (["倒數", "整數除以分數", "分數除以整數", "同分母分數除法", "異分母分數除法", "帶分數除法", "商的意義", "單位量"].includes(topic)) return fractionGenerator;
  if (["數列規律", "圖形規律", "和不變", "差不變", "積不變", "商不變", "間隔問題"].includes(topic)) return relationGenerator;
  if (["整數除以小數", "小數除以整數", "小數除以小數", "商的小數點", "估算", "除法關係", "平均分配"].includes(topic)) return decimalGenerator;
  if (["比的記法", "比值", "相等的比", "最簡整數比", "比的化簡", "連比"].includes(topic)) return ratioGenerator;
  if (["圓周率", "直徑與半徑", "圓周長", "扇形弧長", "扇形周長", "反推半徑"].includes(topic) && stage.generatorKey !== "circle-area") return circleGenerator;
  if (["圓面積", "半徑平方", "扇形面積", "半圓面積", "反推半徑", "組合圖形"].includes(topic)) return areaGenerator;
  if (["速率意義", "距離", "時間", "平均速率", "時速換算", "分速換算", "秒速換算"].includes(topic)) return speedGenerator;
  if (["放大圖", "縮圖", "比例尺", "圖上距離", "實際距離", "長度換算", "面積變化"].includes(topic)) return scaleGenerator;
  if (topic === "後半冊綜合") return combinedReviewGenerator;
  throw new RangeError(`尚未設定關卡運算：${stage.id}/${topic}`);
}

function operationKeysFor(stage) {
  const topic = effectiveTopic(stage);
  if (topic === "後半冊綜合") return ["combined-circle", "combined-speed", "combined-scale"];
  return TOPIC_OPERATION_KEYS[topic];
}

function scenarioProfileFor(stage, topic) {
  if (topic === "反推半徑" && stage.generatorKey === "circle-area") return "circle-area";
  return SCENARIO_PROFILE_BY_TOPIC[topic];
}

function combinedReviewGenerator(topic, operationKey, difficulty, variant, v) {
  if (variant === 0) return circleGenerator("圓周長", operationKey, difficulty, variant, v);
  if (variant === 1) return speedGenerator("平均速率", operationKey, difficulty, variant, v);
  return scaleGenerator("比例尺", operationKey, difficulty, variant, v);
}

export const STAGE_STRATEGY_METADATA = Object.freeze(
  Object.fromEntries(
    COURSE_STAGES.map((stage) => {
      const topic = effectiveTopic(stage);
      const operationKeys = operationKeysFor(stage);
      if (!operationKeys || operationKeys.length !== 3) throw new RangeError(`關卡缺少三種運算：${stage.id}`);
      return [stage.id, Object.freeze({
        stageId: stage.id,
        topic: stage.topic,
        operationTopic: topic,
        domain: stage.generatorKey,
        scenarioProfile: scenarioProfileFor(stage, topic),
        operationKeys: Object.freeze([...operationKeys]),
        strategyKeys: Object.freeze(operationKeys.map((key) => `${stage.generatorKey}:${stage.topic}:${key}`)),
      })];
    })
  )
);

function buildQuestion(stage, difficulty, index, generated, rng) {
  const answer = String(generated.answer);
  const profile = STAGE_STRATEGY_METADATA[stage.id].scenarioProfile;
  const openers = SCENARIO_OPENERS[profile];
  if (!openers) throw new RangeError(`關卡缺少情境敘述：${stage.id}`);
  const question = {
    id: `${stage.id}-${difficulty}-${index}`,
    stageId: stage.id,
    unitId: stage.unitId,
    difficulty,
    concept: `${stage.topic}｜${generated.concept}`,
    type: generated.type,
    prompt: `【${LEVEL_LABEL[difficulty]}｜${stage.topic}】${generated.prompt}`,
    answer,
    hint: generated.hint,
    explanation: generated.explanation,
  };
  if (generated.type === "choice") {
    let choices = generated.choices ? shuffle([...new Set(generated.choices.map(String))], rng) : numericChoices(answer, rng);
    if (!choices.includes(answer)) choices = [...choices.slice(0, 3), answer];
    question.choices = [...new Set(choices)];
  }
  return question;
}

export function generateStageQuestion(stageId, difficulty = "easy", index = 0) {
  const stage = getCourseStage(stageId);
  if (!stage) throw new RangeError(`找不到關卡：${stageId}`);
  if (!STAGE_DIFFICULTIES.includes(difficulty)) throw new RangeError(`不支援的難度：${difficulty}`);
  if (!Number.isInteger(index) || index < 0) throw new RangeError("index 必須是非負整數。");

  const rng = seededRandom(hashSeed(`${stageId}|${difficulty}|${index}`));
  const variant = index % 3;
  const cognitiveMode = COGNITIVE_MODES[Math.floor(index / 3) % COGNITIVE_MODES.length];
  const topic = effectiveTopic(stage);
  const operationKey = operationKeysFor(stage)[variant];
  const generated = applyCognitiveMode(
    generatorFor(stage, topic)(topic, operationKey, difficulty, variant, parameters(stageId, difficulty, index, rng)),
    cognitiveMode,
    index,
    rng
  );
  generated.concept = `${operationKey}:${cognitiveMode}［${STAGE_STRATEGY_METADATA[stageId].strategyKeys[variant]}］`;
  return buildQuestion(stage, difficulty, index, generated, rng);
}

export function generateStageQuestionPool(stageId, difficulty = "easy", count = 50) {
  if (!Number.isInteger(count) || count < 1) throw new RangeError("count 必須是正整數。");
  const questions = [];
  const seen = new Set();
  const maximumAttempts = count * 20;
  for (let index = 0; index < maximumAttempts && questions.length < count; index += 1) {
    const question = generateStageQuestion(stageId, difficulty, index);
    const key = `${question.prompt}\0${question.answer}`;
    if (seen.has(key)) continue;
    seen.add(key);
    questions.push(question);
  }
  if (questions.length < count) {
    throw new RangeError(`${stageId}/${difficulty} 無法產生 ${count} 題不重複題目。`);
  }
  return questions;
}

export function selectStageQuestions({ stageId, difficulty = "easy", count = 10, recentQuestionIds = [], rng = Math.random }) {
  if (!Number.isInteger(count) || count < 1) throw new RangeError("count 必須是正整數。");
  if (typeof rng !== "function") throw new TypeError("rng 必須是函式。");
  const recent = new Set(recentQuestionIds);
  const weightsByTarget = {
    easy: { easy: 6, medium: 3, hard: 1 },
    medium: { easy: 3, medium: 4, hard: 3 },
    hard: { easy: 1, medium: 3, hard: 6 },
  };
  const weights = weightsByTarget[difficulty];
  if (!weights) throw new RangeError(`不支援的難度：${difficulty}`);
  const allocation = allocateDifficultyCounts(count, weights);
  const selected = [];
  for (const level of STAGE_DIFFICULTIES) {
    const levelCount = allocation[level];
    if (!levelCount) continue;
    const pool = generateStageQuestionPool(stageId, level, Math.max(50, levelCount + recent.size));
    selected.push(...selectBalancedStructures(pool, levelCount, recent, rng));
  }
  return shuffle(selected, rng);
}

function allocateDifficultyCounts(count, weights) {
  const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);
  const allocation = Object.fromEntries(STAGE_DIFFICULTIES.map((level) => [level, Math.floor(count * weights[level] / totalWeight)]));
  let remainder = count - Object.values(allocation).reduce((sum, value) => sum + value, 0);
  const priority = [...STAGE_DIFFICULTIES].sort((left, right) =>
    (count * weights[right] / totalWeight % 1) - (count * weights[left] / totalWeight % 1)
  );
  for (let index = 0; remainder > 0; index += 1, remainder -= 1) {
    allocation[priority[index % priority.length]] += 1;
  }
  return allocation;
}

function selectBalancedStructures(pool, count, recent, rng) {
  const groups = new Map();
  for (const question of pool) {
    const fingerprint = getQuestionStructureFingerprint(question);
    const group = groups.get(fingerprint) || [];
    group.push(question);
    groups.set(fingerprint, group);
  }
  const groupsByMode = Object.fromEntries(COGNITIVE_MODES.map((mode) => [mode, []]));
  for (const [fingerprint, group] of groups.entries()) {
    const mode = fingerprint.match(/mode:([^|]+)/)?.[1];
    groupsByMode[mode].push([
      ...shuffle(group.filter((question) => !recent.has(question.id)), rng),
      ...shuffle(group.filter((question) => recent.has(question.id)), rng),
    ]);
  }
  for (const mode of COGNITIVE_MODES) groupsByMode[mode] = shuffle(groupsByMode[mode], rng);
  const selected = [];
  let cycle = 0;
  while (selected.length < count) {
    let added = false;
    for (const mode of COGNITIVE_MODES) {
      if (selected.length >= count) break;
      const modeGroups = groupsByMode[mode];
      const group = modeGroups[cycle % modeGroups.length];
      const question = group.shift();
      if (question) {
        selected.push(question);
        added = true;
      }
    }
    if (!added) break;
    cycle += 1;
  }
  return selected;
}

export function getQuestionStructureFingerprint(question) {
  const concept = String(question?.concept || "");
  const operationKey = concept.split("［")[0].split("｜").at(-1);
  const cognitiveMode = operationKey.split(":").at(-1);
  const solutionSteps = question?.difficulty === "hard" ? 3 : question?.difficulty === "medium" ? 2 : 1;
  return `${operationKey}|${question?.type || "unknown"}|steps:${solutionSteps}|mode:${cognitiveMode}`;
}
