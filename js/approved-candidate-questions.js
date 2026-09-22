import { CANDIDATE_SOURCE } from "./candidate-bank.js";

const COMPLETE_REVIEW = Object.freeze({
  subjectConsistency: true,
  unitsComplete: true,
  conceptAligned: true,
  noAnswerLeakage: true,
  necessarySteps: true,
  wordingReviewed: true,
});

function approvedQuestion({
  sourceId,
  sourcePage,
  stageId,
  unitId,
  difficulty,
  operationKey,
  cognitiveMode = "solve",
  solutionSteps,
  prompt,
  answer,
  hint,
  explanation,
  choices,
}) {
  const question = {
    id: `candidate-${sourceId}`,
    stageId,
    unitId,
    difficulty,
    concept: `${operationKey}:${cognitiveMode}［PDF候選題人工覆核］`,
    operationKey,
    cognitiveMode,
    solutionSteps,
    type: choices ? "choice" : "input",
    prompt,
    answer: String(answer),
    hint,
    explanation,
    sourceMetadata: {
      ...CANDIDATE_SOURCE,
      status: "quality-reviewed",
      originalCandidateId: sourceId,
      reviewStatus: "approved",
      sourcePage,
      extractionMethod: "page-image-rapidocr-manual-review",
    },
    verification: {
      answerChecked: true,
      computedAnswer: String(answer),
      method: "independent-recalculation",
    },
    qualityReview: COMPLETE_REVIEW,
  };
  if (choices) question.choices = choices.map(String);
  return Object.freeze(question);
}

const q = approvedQuestion;

export const APPROVED_CANDIDATE_QUESTIONS = Object.freeze([
  q({
    sourceId: "pdf-u1-q07", sourcePage: 1, stageId: "kx-unit1-stage-08", unitId: "kx-unit1", difficulty: "hard",
    operationKey: "shared-schedule-lcm", solutionSteps: ["辨認同時發生使用最小公倍數", "求 6 和 8 的最小公倍數"],
    prompt: "甲每 6 天整理一次房間，乙每 8 天整理一次。今天兩人同時整理，幾天後會再次同時整理？",
    answer: "24", hint: "找 6 和 8 第一次共同出現的倍數。", explanation: "6 和 8 的最小公倍數是 24，所以 24 天後會再次同時整理。",
  }),
  q({
    sourceId: "pdf-u1-q08", sourcePage: 1, stageId: "kx-unit1-stage-08", unitId: "kx-unit1", difficulty: "hard",
    operationKey: "equal-grouping-gcd", solutionSteps: ["辨認平均分組使用最大公因數", "求 48 和 60 的最大公因數"],
    prompt: "有 48 顆紅球和 60 顆藍球，要平均分成相同的組，每組的紅球數與藍球數都相同，最多可分成幾組？",
    answer: "12", hint: "組數必須同時整除 48 和 60。", explanation: "48 和 60 的最大公因數是 12，所以最多可分成 12 組。",
  }),
  q({
    sourceId: "pdf-u2-q07", sourcePage: 2, stageId: "kx-unit2-stage-09", unitId: "kx-unit2", difficulty: "hard",
    operationKey: "fraction-length-portions", solutionSteps: ["用總長除以每段長", "以倒數相乘"],
    prompt: "一條緞帶長 3/4 公尺，每 1/8 公尺剪成一段，一共可以剪成幾段？",
    answer: "6", hint: "用 3/4 ÷ 1/8。", explanation: "3/4 ÷ 1/8＝3/4 × 8＝6，所以可剪成 6 段。",
  }),
  q({
    sourceId: "pdf-u2-q08", sourcePage: 2, stageId: "kx-unit2-stage-09", unitId: "kx-unit2", difficulty: "hard",
    operationKey: "fraction-volume-portions", solutionSteps: ["把帶分數化成假分數", "用總量除以每杯容量"],
    prompt: "有 2又1/2 公升果汁，每杯裝 1/4 公升，一共可以裝幾杯？",
    answer: "10", hint: "先把 2又1/2 化成 5/2。", explanation: "5/2 ÷ 1/4＝5/2 × 4＝10，所以可裝 10 杯。",
  }),
  q({
    sourceId: "pdf-u2-q09", sourcePage: 2, stageId: "kx-unit2-stage-09", unitId: "kx-unit2", difficulty: "hard",
    operationKey: "fraction-mass-portions", solutionSteps: ["用總重量除以每次用量", "以倒數相乘"],
    prompt: "媽媽有 3/5 公斤麵粉，每次使用 1/10 公斤，最多可以使用幾次？",
    answer: "6", hint: "用 3/5 ÷ 1/10。", explanation: "3/5 ÷ 1/10＝3/5 × 10＝6，所以可以使用 6 次。",
  }),
  q({
    sourceId: "pdf-u2-q10", sourcePage: 2, stageId: "kx-unit2-stage-07", unitId: "kx-unit2", difficulty: "medium",
    operationKey: "compare-fraction-quotients", cognitiveMode: "verify", solutionSteps: ["分別求出兩個商", "比較商的大小"],
    prompt: "比較 2/3 ÷ 1/3 與 2/3 ÷ 2，哪一個算式的商比較大？",
    answer: "左式較大", choices: ["左式較大", "右式較大", "兩式相等", "無法比較"],
    hint: "先分別算出兩個算式的商。", explanation: "2/3 ÷ 1/3＝2；2/3 ÷ 2＝1/3，因此左式較大。",
  }),
  q({
    sourceId: "pdf-u2-q11", sourcePage: 2, stageId: "kx-unit2-stage-08", unitId: "kx-unit2", difficulty: "hard",
    operationKey: "recover-whole-from-fraction", solutionSteps: ["辨認部分量與分率", "用部分量除以分率"],
    prompt: "小明走了 5/6 公里，這段路是全程的 5/8。全程長多少公里？",
    answer: "4/3", hint: "用已走的距離除以全程所占的分率。", explanation: "5/6 ÷ 5/8＝5/6 × 8/5＝4/3，所以全程長 4/3 公里。",
  }),
  q({
    sourceId: "pdf-u2-q12", sourcePage: 2, stageId: "kx-unit2-stage-08", unitId: "kx-unit2", difficulty: "medium",
    operationKey: "reverse-fraction-dividend", cognitiveMode: "verify", solutionSteps: ["把未知數除法寫成關係式", "用商乘除數反推被除數"],
    prompt: "一個數除以 3/4 得到 8，這個數是多少？",
    answer: "6", hint: "被除數＝商×除數。", explanation: "8 × 3/4＝6，所以這個數是 6。",
  }),
  q({
    sourceId: "pdf-u3-q08", sourcePage: 3, stageId: "kx-unit3-stage-04", unitId: "kx-unit3", difficulty: "medium",
    operationKey: "decreasing-quantity-expression", solutionSteps: ["找出原有數量", "以每天減少量乘天數"],
    prompt: "小明有 40 元，每天用掉 6 元。用含 n 的式子表示 n 天後剩下的錢。",
    answer: "40－6n", choices: ["40－6n", "40＋6n", "6n－40", "40－n"],
    hint: "n 天共用掉 6n 元。", explanation: "原有 40 元，n 天共用掉 6n 元，所以剩下 40－6n 元。",
  }),
  q({
    sourceId: "pdf-u3-q11", sourcePage: 3, stageId: "kx-unit3-stage-01", unitId: "kx-unit3", difficulty: "hard",
    operationKey: "consecutive-even-numbers", solutionSteps: ["設中間偶數", "利用三數總和反推", "寫出相鄰偶數"],
    prompt: "連續三個偶數的和是 42，這三個偶數分別是多少？",
    answer: "12、14、16", choices: ["10、14、18", "12、14、16", "11、14、17", "8、14、20"],
    hint: "三個連續偶數的中間數等於平均數。", explanation: "42 ÷ 3＝14，中間數是 14，前後相差 2，所以是 12、14、16。",
  }),
  q({
    sourceId: "pdf-u4-q07", sourcePage: 4, stageId: "kx-unit4-stage-08", unitId: "kx-unit4", difficulty: "hard",
    operationKey: "decimal-length-portions", solutionSteps: ["用總長除以每段長", "計算小數除法"],
    prompt: "一條繩子長 9.6 公尺，每 0.8 公尺剪成一段，一共可以剪成幾段？",
    answer: "12", hint: "用 9.6 ÷ 0.8。", explanation: "9.6 ÷ 0.8＝12，所以可以剪成 12 段。",
  }),
  q({
    sourceId: "pdf-u4-q08", sourcePage: 4, stageId: "kx-unit4-stage-08", unitId: "kx-unit4", difficulty: "hard",
    operationKey: "decimal-volume-portions", solutionSteps: ["用總容量除以每杯容量", "計算小數除法"],
    prompt: "一瓶有 2.4 公升果汁，每杯倒 0.3 公升，一共可以倒幾杯？",
    answer: "8", hint: "用 2.4 ÷ 0.3。", explanation: "2.4 ÷ 0.3＝8，所以可以倒 8 杯。",
  }),
  q({
    sourceId: "pdf-u4-q09", sourcePage: 4, stageId: "kx-unit4-stage-04", unitId: "kx-unit4", difficulty: "medium",
    operationKey: "make-decimal-divisor-integer", cognitiveMode: "verify", solutionSteps: ["觀察除數的小數位數", "決定同步放大倍數"],
    prompt: "小數除法中，除數是 0.4 時，被除數和除數要同時乘以多少，才能使除數變成整數？",
    answer: "10", hint: "0.4 的小數點向右移一位會變成 4。", explanation: "被除數與除數同時乘以 10，商不變，除數 0.4 會變成整數 4。",
  }),
  q({
    sourceId: "pdf-u5-q06", sourcePage: 5, stageId: "kx-unit5-stage-07", unitId: "kx-unit5", difficulty: "hard",
    operationKey: "ratio-part-from-total", solutionSteps: ["求總份數", "用總量除以總份數", "乘紅球份數"],
    prompt: "一袋紅球與藍球的數量比是 2：3，共有 25 顆球。紅球有幾顆？",
    answer: "10", hint: "全部共有 2＋3＝5 份。", explanation: "25 ÷ 5＝5，每份 5 顆；紅球有 5 × 2＝10 顆。",
  }),
  q({
    sourceId: "pdf-u5-q07", sourcePage: 5, stageId: "kx-unit5-stage-07", unitId: "kx-unit5", difficulty: "hard",
    operationKey: "ratio-counterpart-from-known-part", solutionSteps: ["求一份的量", "乘另一數的份數"],
    prompt: "甲、乙兩數的比是 4：7，甲數是 20，乙數是多少？",
    answer: "35", hint: "甲數的 4 份是 20。", explanation: "20 ÷ 4＝5，每份是 5；乙數是 5 × 7＝35。",
  }),
  q({
    sourceId: "pdf-u5-q09", sourcePage: 5, stageId: "kx-unit5-stage-07", unitId: "kx-unit5", difficulty: "hard",
    operationKey: "ratio-mixture-counterpart", solutionSteps: ["由糖的份數求一份", "乘水的份數"],
    prompt: "糖與水的重量比是 1：4。若糖有 150 克，水有幾克？",
    answer: "600", hint: "糖的 1 份就是 150 克。", explanation: "水占 4 份，所以水重 150 × 4＝600 克。",
  }),
  q({
    sourceId: "pdf-u5-q12", sourcePage: 5, stageId: "kx-unit5-stage-07", unitId: "kx-unit5", difficulty: "hard",
    operationKey: "ratio-parts-from-sum", solutionSteps: ["求總份數", "用總和求一份", "分別乘兩數份數"],
    prompt: "若 a：b＝3：4，且 a＋b＝35，a 和 b 各是多少？",
    answer: "15、20", choices: ["12、23", "15、20", "18、17", "21、14"],
    hint: "a 和 b 合計有 3＋4＝7 份。", explanation: "35 ÷ 7＝5，所以 a＝3 × 5＝15，b＝4 × 5＝20。",
  }),
  q({
    sourceId: "pdf-u6-q04", sourcePage: 7, stageId: "kx-unit6-stage-06", unitId: "kx-unit6", difficulty: "medium",
    operationKey: "radius-from-circumference", solutionSteps: ["由圓周長除以圓周率求直徑", "直徑除以 2 求半徑"],
    prompt: "一個圓的圓周長是 31.4 公分，圓周率取 3.14，半徑是多少公分？",
    answer: "5", hint: "先用圓周長 ÷ 圓周率求直徑。", explanation: "31.4 ÷ 3.14＝10，直徑是 10 公分，半徑是 5 公分。",
  }),
  q({
    sourceId: "pdf-u6-q05", sourcePage: 7, stageId: "kx-unit6-stage-07", unitId: "kx-unit6", difficulty: "hard",
    operationKey: "circular-garden-circumference", solutionSteps: ["辨認直徑", "用直徑乘圓周率"],
    prompt: "一座直徑 20 公尺的圓形花圃，繞花圃一圈要走多少公尺？圓周率取 3.14。",
    answer: "62.8", hint: "圓周長＝直徑×圓周率。", explanation: "20 × 3.14＝62.8，所以一圈長 62.8 公尺。",
  }),
  q({
    sourceId: "pdf-u6-q07", sourcePage: 7, stageId: "kx-unit6-stage-05", unitId: "kx-unit6", difficulty: "hard",
    operationKey: "semicircle-perimeter", solutionSteps: ["求半圓弧長", "加上直徑"],
    prompt: "半徑 4 公分的半圓，周長是多少公分？圓周率取 3.14。",
    answer: "20.56", hint: "半圓周長包含半圓弧和一條直徑。", explanation: "半圓弧長為 3.14 × 4＝12.56；直徑是 8，所以周長是 20.56 公分。",
  }),
  q({
    sourceId: "pdf-u6-q09", sourcePage: 7, stageId: "kx-unit6-stage-05", unitId: "kx-unit6", difficulty: "hard",
    operationKey: "quarter-circle-perimeter-expression", cognitiveMode: "verify", solutionSteps: ["求四分之一圓弧", "加上兩條半徑"],
    prompt: "半徑 8 公分的四分之一圓，周長是多少公分？圓周率取 3.14。",
    answer: "28.56", hint: "周長包含四分之一圓弧和兩條半徑。", explanation: "四分之一圓弧是 2 × 3.14 × 8 ÷ 4＝12.56；再加 8＋8，周長是 28.56 公分。",
  }),
  q({
    sourceId: "pdf-u7-q04", sourcePage: 8, stageId: "kx-unit7-stage-05", unitId: "kx-unit7", difficulty: "medium",
    operationKey: "radius-from-circle-area", solutionSteps: ["面積除以圓周率求半徑平方", "求正平方根"],
    prompt: "一個圓的面積是 78.5 平方公分，圓周率取 3.14，半徑是多少公分？",
    answer: "5", hint: "先算 78.5 ÷ 3.14。", explanation: "78.5 ÷ 3.14＝25，因為 5 × 5＝25，所以半徑是 5 公分。",
  }),
  q({
    sourceId: "pdf-u7-q08", sourcePage: 8, stageId: "kx-unit7-stage-06", unitId: "kx-unit7", difficulty: "hard",
    operationKey: "semicircle-area-and-perimeter", solutionSteps: ["求半圓面積", "求半圓弧長", "加直徑求周長"],
    prompt: "半徑 6 公分的半圓，面積和周長分別是多少？圓周率取 3.14。",
    answer: "56.52、30.84", choices: ["56.52、30.84", "56.52、18.84", "113.04、30.84", "113.04、18.84"],
    hint: "面積要除以 2；周長還要加上直徑。", explanation: "面積是 3.14 × 6 × 6 ÷ 2＝56.52；周長是 3.14 × 6＋12＝30.84。",
  }),
  q({
    sourceId: "pdf-u7-q10", sourcePage: 8, stageId: "kx-unit7-stage-07", unitId: "kx-unit7", difficulty: "hard",
    operationKey: "circular-garden-area", solutionSteps: ["辨認半徑", "套用圓面積公式"],
    prompt: "一座圓形花圃的半徑是 8 公尺，面積是多少平方公尺？圓周率取 3.14。",
    answer: "200.96", hint: "圓面積＝圓周率×半徑×半徑。", explanation: "3.14 × 8 × 8＝200.96，所以面積是 200.96 平方公尺。",
  }),
  q({
    sourceId: "pdf-u8-q05", sourcePage: 9, stageId: "kx-unit8-stage-05", unitId: "kx-unit8", difficulty: "medium",
    operationKey: "hourly-to-minute-kilometres", solutionSteps: ["一小時換成 60 分鐘", "用時速除以 60"],
    prompt: "時速 72 公里，換算成每分鐘行駛多少公里？",
    answer: "1.2", hint: "1 小時有 60 分鐘。", explanation: "72 ÷ 60＝1.2，所以每分鐘行駛 1.2 公里。",
  }),
  q({
    sourceId: "pdf-u8-q06", sourcePage: 9, stageId: "kx-unit8-stage-08", unitId: "kx-unit8", difficulty: "hard",
    operationKey: "distance-from-hourly-speed-and-minutes", solutionSteps: ["把分鐘換成小時", "用速率乘時間"],
    prompt: "一輛車以時速 90 公里行駛 40 分鐘，共行駛多少公里？",
    answer: "60", hint: "40 分鐘是 2/3 小時。", explanation: "90 × 2/3＝60，所以共行駛 60 公里。",
  }),
  q({
    sourceId: "pdf-u8-q07", sourcePage: 9, stageId: "kx-unit8-stage-06", unitId: "kx-unit8", difficulty: "hard",
    operationKey: "metres-per-minute-from-kilometres", solutionSteps: ["把公里換成公尺", "用路程除以分鐘"],
    prompt: "小明 30 分鐘走了 2.4 公里，平均每分鐘走多少公尺？",
    answer: "80", hint: "2.4 公里＝2400 公尺。", explanation: "2400 ÷ 30＝80，所以平均每分鐘走 80 公尺。",
  }),
  q({
    sourceId: "pdf-u8-q08", sourcePage: 9, stageId: "kx-unit8-stage-08", unitId: "kx-unit8", difficulty: "hard",
    operationKey: "distance-gap-from-speed-difference", solutionSteps: ["求兩車速度差", "速度差乘共同時間"],
    prompt: "甲車時速 60 公里，乙車時速 80 公里，兩車同時同方向出發，2 小時後相差多少公里？",
    answer: "40", hint: "先求每小時相差多少公里。", explanation: "每小時相差 80－60＝20 公里；2 小時相差 20 × 2＝40 公里。",
  }),
  q({
    sourceId: "pdf-u8-q10", sourcePage: 9, stageId: "kx-unit8-stage-04", unitId: "kx-unit8", difficulty: "medium",
    operationKey: "average-speed-decimal-hours", solutionSteps: ["用總路程除以總時間", "計算含小數時間的除法"],
    prompt: "一輛車 2.5 小時行駛 175 公里，平均時速是多少公里？",
    answer: "70", hint: "平均速率＝總路程÷總時間。", explanation: "175 ÷ 2.5＝70，所以平均時速是 70 公里。",
  }),
  q({
    sourceId: "pdf-u9-q03", sourcePage: 10, stageId: "kx-unit9-stage-01", unitId: "kx-unit9", difficulty: "medium",
    operationKey: "enlarge-triangle-sides", solutionSteps: ["辨認放大倍數", "每一邊都乘相同倍數"],
    prompt: "一個三角形的三邊長是 3、4、5 公分，放大 2 倍後，三邊各是多少公分？",
    answer: "6、8、10", choices: ["5、6、7", "6、8、10", "6、8、12", "9、12、15"],
    hint: "放大圖的每一條邊都乘以 2。", explanation: "3 × 2＝6、4 × 2＝8、5 × 2＝10，所以三邊是 6、8、10 公分。",
  }),
  q({
    sourceId: "pdf-u9-q04", sourcePage: 10, stageId: "kx-unit9-stage-03", unitId: "kx-unit9", difficulty: "medium",
    operationKey: "derive-scale-from-lengths", solutionSteps: ["寫出圖上距離比實際距離", "化成最簡比"],
    prompt: "圖上長度是 5 公分，實際長度是 20 公分，比例尺是多少？",
    answer: "1：4", choices: ["1：4", "4：1", "1：5", "5：1"],
    hint: "比例尺＝圖上距離：實際距離。", explanation: "5：20 化成最簡整數比是 1：4，所以比例尺是 1：4。",
  }),
  q({
    sourceId: "pdf-u9-q06", sourcePage: 10, stageId: "kx-unit9-stage-04", unitId: "kx-unit9", difficulty: "hard",
    operationKey: "map-length-from-metres", solutionSteps: ["把實際公尺換成公分", "依比例尺除以縮小倍數"],
    prompt: "比例尺是 1：1000，實際距離 50 公尺，在圖上是多少公分？",
    answer: "5", hint: "先把 50 公尺換成 5000 公分。", explanation: "50 公尺＝5000 公分；5000 ÷ 1000＝5，所以圖上是 5 公分。",
  }),
  q({
    sourceId: "pdf-u9-q07", sourcePage: 10, stageId: "kx-unit9-stage-07", unitId: "kx-unit9", difficulty: "hard",
    operationKey: "area-change-from-length-scale", solutionSteps: ["把長度倍數平方", "原面積乘面積倍數"],
    prompt: "原圖面積是 12 平方公分，長度都放大 2 倍後，面積會變成多少平方公分？",
    answer: "48", hint: "長度放大 2 倍，面積會放大 2 × 2 倍。", explanation: "面積放大 4 倍，12 × 4＝48，所以新面積是 48 平方公分。",
  }),
  q({
    sourceId: "pdf-u9-q09", sourcePage: 10, stageId: "kx-unit9-stage-05", unitId: "kx-unit9", difficulty: "hard",
    operationKey: "actual-kilometres-from-map-centimetres", solutionSteps: ["用圖上距離乘比例尺倍數", "把公分換成公里"],
    prompt: "地圖比例尺是 1：50000，圖上 6 公分代表實際多少公里？",
    answer: "3", hint: "先算出實際公分數，再換成公里。", explanation: "6 × 50000＝300000 公分＝3 公里。",
  }),
  q({
    sourceId: "pdf-r2-q11", sourcePage: 11, stageId: "kx-review2-stage-06", unitId: "kx-review2", difficulty: "medium",
    operationKey: "recover-whole-from-given-fraction-review", solutionSteps: ["以部分量除以分率", "用倒數驗算"],
    prompt: "一個數的 3/5 是 24，這個數是多少？",
    answer: "40", hint: "用 24 ÷ 3/5。", explanation: "24 ÷ 3/5＝24 × 5/3＝40，所以這個數是 40。",
  }),
]);

export function getApprovedCandidatesForStage(stageId, difficulty) {
  return APPROVED_CANDIDATE_QUESTIONS.filter(
    (question) => question.stageId === stageId && (!difficulty || question.difficulty === difficulty)
  );
}
