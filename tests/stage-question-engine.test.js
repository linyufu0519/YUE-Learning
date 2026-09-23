import test from "node:test";
import assert from "node:assert/strict";
import { COURSE_STAGES } from "../js/course-stages.js";
import { gradeAnswer } from "../js/logic.js";
import {
  STAGE_DIFFICULTIES,
  STAGE_STRATEGY_METADATA,
  EXPLICIT_CHOICE_CUE,
  generateStageQuestion,
  generateStageQuestionPool,
  getOfficialStageQuestionPool,
  getQuestionStructureFingerprint,
  selectStageQuestions,
} from "../js/stage-question-engine.js";
import { APPROVED_CANDIDATE_QUESTIONS } from "../js/approved-candidate-questions.js";

function fixedRng(values) {
  let position = 0;
  return () => values[position++ % values.length];
}

function mathematicallyCorrect(question, choice) {
  return gradeAnswer({ ...question, type: "input" }, choice);
}

const OPERATION_EVIDENCE = {
  "質數與合數": /因數|合數/,
  質因數分解: /分解|因數/,
  公因數: /公因數|同時整除|共同的每包數/,
  最大公因數: /最大公因數|最多相同組/,
  公倍數: /公倍數|共同閃/,
  最小公倍數: /最小公倍數|同時活動/,
  短除法: /短除法/,
  倒數: /倒數/,
  整數除以分數: /\d+ ÷ \d+\/\d+|整數除以分數/,
  分數除以整數: /\d+\/\d+ ÷ \d+|分數除以整數/,
  同分母分數除法: /同分母|\/\d+ ÷ \d+\/\d+/,
  異分母分數除法: /兩分母不同|異分母|每份用|\/\d+ ÷ \d+\/\d+/,
  帶分數除法: /又\d+\/\d+|帶分數/,
  商的意義: /平均分成|每.+裝|包含幾份|可裝/,
  單位量: /單位量|每份/,
  數列規律: /第.+項|首項/,
  圖形規律: /圖形|第.+項/,
  和不變: /和不變/,
  差不變: /差不變/,
  積不變: /積不變/,
  商不變: /商不變/,
  間隔問題: /每隔|間距|封閉路線/,
  整數除以小數: /\d+ ÷ 0\.\d+|整數除以小數/,
  小數除以整數: /\d+\.\d+ ÷ \d+|小數除以整數/,
  小數除以小數: /\d+\.\d+ ÷ 0\.\d+|小數除以小數/,
  商的小數點: /小數點/,
  估算: /估/,
  除法關係: /反推|還原被除數|÷/,
  平均分配: /平均分|每份/,
  比的記法: /前項|後項|寫成比/,
  比值: /比值|前項/,
  相等的比: /化簡|同乘|最簡比/,
  最簡整數比: /化簡|最簡比/,
  比的化簡: /化為整數比|化簡|最簡比/,
  連比: /：.+：|三項|三份/,
  圓周率: /圓周長.+直徑|圓周率|3\.14/,
  直徑與半徑: /直徑|半徑/,
  圓周長: /圓周長|一圈周長/,
  扇形弧長: /弧長/,
  扇形周長: /扇形|弧長加兩條半徑/,
  反推半徑: /反推半徑|半徑是多少|半徑平方/,
  圓面積: /圓面積/,
  半徑平方: /半徑平方/,
  扇形面積: /1\/\d+ 圓(?:形區域|面積)|部分圓面積/,
  半圓面積: /1\/2 圓(?:形區域|面積)|部分圓面積/,
  組合圖形: /兩圓|環形|大圓/,
  速率意義: /速率|公里\/時/,
  距離: /距離|共走/,
  時間: /需要幾小時|還剩幾小時|走了.+小時/,
  平均速率: /平均速率/,
  時速換算: /小時|分鐘/,
  分速換算: /分鐘|秒/,
  秒速換算: /秒|分鐘/,
  放大圖: /放大圖|放大/,
  縮圖: /縮圖|縮小/,
  比例尺: /比例尺/,
  圖上距離: /圖上/,
  實際距離: /實際/,
  長度換算: /公分|公尺|公里/,
  面積變化: /面積.+倍|面積倍率/,
  後半冊綜合: /圓周長|一圈周長|平均速率|比例尺/,
};

const SCENARIO_EVIDENCE = {
  "number-structure": /數字卡|數字密碼|分類板/,
  "factor-grouping": /分裝用品|平均分組|相同組/,
  "multiple-cycles": /活動的週期|規律閃爍|固定間隔/,
  "fraction-sharing": /果汁與麵粉|分數份量|食譜/,
  "pattern-building": /積木圖案|規律序列|增加的圖形/,
  "invariant-lab": /運算結果保持不變|和、差、積或商|結果仍然相同/,
  "interval-planning": /路燈與座位|等距放置|等距設施/,
  "decimal-sharing": /小數除法|商品重量|帶有小數/,
  "ratio-mixture": /按比例混合|前項、後項與比值|比和連比/,
  "circle-boundary": /輪子與花圈|圓形跑道|扇形邊框/,
  "circle-area": /圓形花圃|圓桌和半圓地墊|圓形組成/,
  motion: /騎車與跑步|交通路線|兩段旅程/,
  "map-model": /地圖教室|放大圖與縮圖|校園平面圖/,
  "semester-challenge": /學期成果挑戰站|六上總複習|數學闖關賽/,
};

test("79 關皆由 topic dispatcher 綁定三個實際 operation，而非單元共用模板", () => {
  assert.equal(COURSE_STAGES.length, 79);
  assert.equal(Object.keys(STAGE_STRATEGY_METADATA).length, 79);
  for (const stage of COURSE_STAGES) {
    const contract = STAGE_STRATEGY_METADATA[stage.id];
    assert.equal(contract.stageId, stage.id);
    assert.equal(contract.topic, stage.topic);
    assert.ok(OPERATION_EVIDENCE[contract.operationTopic], `${stage.id} 缺少 topic contract`);
    assert.equal(contract.operationKeys.length, 3);
    assert.equal(new Set(contract.operationKeys).size, 3);
    for (const [index, operationKey] of contract.operationKeys.entries()) {
      const question = generateStageQuestion(stage.id, "easy", index);
      assert.ok(question.concept.includes(operationKey), `${stage.id} 未執行 ${operationKey}`);
      assert.match(`${question.prompt} ${question.hint} ${question.explanation}`, OPERATION_EVIDENCE[contract.operationTopic], `${stage.id}/${operationKey} 語意錯配`);
      assert.equal(gradeAnswer(question, question.answer), true);
    }
  }
});

test("公因數只做共同整除，不會因 variant 誤出最小公倍數", () => {
  const stage = COURSE_STAGES.find((item) => item.topic === "公因數");
  for (const difficulty of STAGE_DIFFICULTIES) {
    for (let index = 0; index < 9; index += 1) {
      const question = generateStageQuestion(stage.id, difficulty, index);
      assert.doesNotMatch(`${question.prompt} ${question.hint} ${question.explanation}`, /最小公倍數|最早同時/);
      assert.match(question.concept, /list-common-factors|common-divisibility|equal-grouping/);
    }
  }
});

test("所有 hard 題由生成器產生單一完整情境，不再拼接第二層主角與無關套語", () => {
  const actorPattern = /小玥|小安|志明|雅婷|老師|爸爸|媽媽|店長/g;
  for (const stage of COURSE_STAGES) {
    const contract = STAGE_STRATEGY_METADATA[stage.id];
    assert.ok(SCENARIO_EVIDENCE[contract.scenarioProfile], `${stage.id} 缺少情境契約`);
    const questions = generateStageQuestionPool(stage.id, "hard", 50);
    for (const question of questions) {
      const actors = question.prompt.match(actorPattern) || [];
      assert.ok(actors.length <= 1, `${question.id} 出現多個主角：${actors.join("、")}`);
      assert.doesNotMatch(question.prompt, /準備彩帶時|遇到這題|破解數字密碼|數學角整理|貼到分類板/);
      assert.doesNotMatch(question.prompt, /個(?:果汁|緞帶|盆栽)排成每排/);
      assert.match(`${question.prompt} ${question.hint} ${question.explanation}`, OPERATION_EVIDENCE[contract.operationTopic], `${question.id} 情境與主題不符`);
      assert.doesNotMatch(`${question.prompt} ${question.answer}`, /NaN|Infinity/);
    }
  }
});

test("質數與合數所有難度都要求主動判斷因數，不在題幹洩漏乘法分解", () => {
  const stage = COURSE_STAGES.find((item) => item.topic === "質數與合數");
  for (const difficulty of STAGE_DIFFICULTIES) {
    for (let index = 0; index < 50; index += 1) {
      const question = generateStageQuestion(stage.id, difficulty, index);
      assert.match(`${question.prompt} ${question.hint} ${question.explanation}`, /因數|整除|剛好分完/);
      assert.doesNotMatch(question.prompt, /先排好|再多排|一共是|可寫成 \d+ × \d+|等於 \d+ × \d+/);
    }
  }
});

test("質數與合數的因數選擇題只有一個非平凡因數選項", () => {
  const stage = COURSE_STAGES.find((item) => item.topic === "質數與合數");
  for (const difficulty of STAGE_DIFFICULTIES) {
    for (const question of generateStageQuestionPool(stage.id, difficulty, 50)) {
      if (question.type !== "choice" || !/哪個.+(?:因數|剛好分完)/.test(question.prompt)) continue;
      if (question.choices.every((choice) => ["正確", "不正確"].includes(choice))) continue;
      const value = Number(question.prompt.match(/\d+/)?.[0]);
      const validChoices = question.choices.filter((choice) => {
        const candidate = Number(choice);
        return Number.isInteger(candidate) && candidate > 1 && candidate < value && value % candidate === 0;
      });
      assert.deepEqual(validChoices, [question.answer], `${question.id}: ${question.choices.join("、")}`);
    }
  }
});

test("非平凡因數選擇題清楚重述目標數與上下界", () => {
  const stage = COURSE_STAGES.find((item) => item.topic === "質數與合數");
  for (const difficulty of STAGE_DIFFICULTIES) {
    for (let index = 0; index < 50; index += 1) {
      const question = generateStageQuestion(stage.id, difficulty, index);
      if (!/下列哪一個數是/.test(question.prompt)) continue;
      const target = question.prompt.match(/是\s*(\d+)\s*的因數/)?.[1];
      assert.ok(target, `${question.id} 未清楚寫出目標數的因數`);
      assert.match(question.prompt, new RegExp(`大於 1、小於 ${target}`));
      assert.equal(question.type, "choice");
    }
  }
});

test("22個積木回歸案例保留選項，且只有2是可見的非平凡因數", () => {
  const question = generateStageQuestion("kx-unit1-stage-01", "hard", 27);
  assert.equal(question.prompt, "雅婷有 22 個積木，想平均分成每組至少 2 個。下列哪個每組數量可剛好分完，並能證明 22 是合數？");
  assert.equal(question.type, "choice");
  assert.equal(question.answer, "2");
  assert.ok(question.choices.length >= 2);
  const validFactors = question.choices.filter((choice) => {
    const value = Number(choice);
    return Number.isInteger(value) && value > 1 && value < 22 && 22 % value === 0;
  });
  assert.deepEqual(validFactors, ["2"]);
  assert.equal(question.choices.includes("11"), false);
});

test("44因數個數verify題是單一清楚命題，不再套用巢狀指令", () => {
  const question = generateStageQuestion("kx-unit1-stage-01", "hard", 7);
  assert.equal(question.prompt, "有人說：「44 共有 6 個因數，所以 44 不是質數。」這個說法正確嗎？");
  assert.equal(question.type, "choice");
  assert.deepEqual(new Set(question.choices), new Set(["正確", "不正確"]));
  assert.equal(question.answer, "正確");
  assert.equal(question.hint, "先列出 44 的所有因數，再檢查因數個數與結論。");
  assert.match(question.explanation, /44 的因數是 1、2、4、11、22、44，共有 6 個/);
  assert.doesNotMatch(`${question.prompt} ${question.hint}`, /先完成「|再判斷答案|比較同學寫的/);
});

test("input題若含「可以」仍必須是唯一數量問題，不得是任一集合成員", () => {
  let measurableCanQuestions = 0;
  for (const stage of COURSE_STAGES) {
    for (const difficulty of STAGE_DIFFICULTIES) {
      for (let index = 0; index < 50; index += 1) {
        const question = generateStageQuestion(stage.id, difficulty, index);
        if (question.type !== "input" || !question.prompt.includes("可以")) continue;
        measurableCanQuestions += 1;
        assert.match(question.prompt, /幾(?:瓶|杯|份|段|個|組|次|公尺|公里|小時|分鐘|秒)/);
        assert.doesNotMatch(question.prompt, /哪個|哪一個|何者|任一|請選出|因數|倍數|公因數|公倍數/);
        assert.match(question.answer, /^-?\d+(?:\.\d+)?(?:\/\d+)?$/);
      }
    }
  }
  assert.ok(measurableCanQuestions > 0);
});

test("公因數與公倍數選擇題依題意驗證，每題只有一個語意正解", () => {
  const cases = [
    {
      topic: "公因數",
      pattern: /同時整除 (\d+) 和 (\d+)/,
      satisfies: (choice, left, right) => left % choice === 0 && right % choice === 0,
    },
    {
      topic: "公倍數",
      pattern: /同時是 (\d+) 和 (\d+) 的倍數/,
      satisfies: (choice, left, right) => choice % left === 0 && choice % right === 0,
    },
  ];
  for (const { topic, pattern, satisfies } of cases) {
    const stage = COURSE_STAGES.find((item) => item.topic === topic);
    for (const difficulty of STAGE_DIFFICULTIES) {
      for (const question of generateStageQuestionPool(stage.id, difficulty, 50)) {
        const match = question.prompt.match(pattern);
        if (!match || question.type !== "choice" || question.choices.every((choice) => ["正確", "不正確"].includes(choice))) continue;
        const [, leftText, rightText] = match;
        const left = Number(leftText);
        const right = Number(rightText);
        const correctChoices = question.choices.filter((choice) => satisfies(Number(choice), left, right));
        assert.deepEqual(correctChoices, [question.answer], `${question.id}: ${question.choices.join("、")}`);
      }
    }
  }
});

test("學生題幹不顯示內部難度與 operation 標籤，分數生活題份數為整數", () => {
  const fractionLifeStage = COURSE_STAGES.find((item) => item.unitId === "kx-unit2" && item.topic === "生活應用");
  for (const stage of COURSE_STAGES) {
    for (const difficulty of STAGE_DIFFICULTIES) {
      for (const question of generateStageQuestionPool(stage.id, difficulty, 50)) {
        assert.doesNotMatch(question.prompt, /^【.+｜.+】/);
      }
    }
  }
  for (const question of generateStageQuestionPool(fractionLifeStage.id, "hard", 50)) {
    if (/可以裝成幾份/.test(question.prompt) && question.type === "input") {
      assert.equal(Number.isInteger(Number(question.answer)), true, question.id);
    }
  }
});

test("核心概念品質清單：代表性 hard 題的每一步都服務同一考點", () => {
  const stageFor = (topic) => COURSE_STAGES.find((stage) => stage.topic === topic).id;
  const checks = [
    ["質數與合數", /因數|剛好分完/, /再多排|先算總數/],
    ["異分母分數除法", /每份|可以分成幾份/, /份數再乘|貼紙|冰塊/],
    ["連比", /按.+：.+：.+分三份|甲：乙：丙/, /又多準備|各增加/],
    ["圓周率", /輪子完整滾動|圓周長/, /再前進|再加/],
    ["平均速率", /第一段.+第二段|平均速率/, /再多走|再加/],
    ["比例尺", /地圖.+比例尺|圖上.+實際/, /再增加|再加/],
  ];
  for (const [topic, required, forbidden] of checks) {
    const questions = generateStageQuestionPool(stageFor(topic), "hard", 50);
    assert.ok(questions.every((question) => required.test(`${question.prompt} ${question.hint} ${question.explanation}`)), `${topic} 核心概念不足`);
    assert.ok(questions.every((question) => !forbidden.test(question.prompt)), `${topic} 含無關拼接步驟`);
  }
});

test("全部 hard 題不得使用已知的無關算術拼接樣板", () => {
  const forbidden = /每瓶貼 2 張|每杯放 2 顆|份數再乘 2|再少買 2 件|又多買|再把半徑(?:加|增加) 2|再加鋪 \d+ 平方|再多準備|兩項各增加 2|再前進 \d+ 公分/;
  for (const stage of COURSE_STAGES) {
    for (const question of generateStageQuestionPool(stage.id, "hard", 50)) {
      assert.doesNotMatch(question.prompt, forbidden, question.id);
    }
  }
});

test("分數各 topic 的運算型態及答案不變量正確", () => {
  const byTopic = Object.fromEntries(COURSE_STAGES.map((stage) => [stage.topic, stage]));

  const integerFraction = generateStageQuestion(byTopic["整數除以分數"].id, "easy", 0);
  const [, whole, numerator, denominator] = integerFraction.prompt.match(/(\d+) ÷ (\d+)\/(\d+)/);
  assert.equal(Number(integerFraction.answer), Number(whole) * Number(denominator) / Number(numerator));

  const different = generateStageQuestion(byTopic["異分母分數除法"].id, "easy", 0);
  const [, n1, d1, n2, d2] = different.prompt.match(/(\d+)\/(\d+) ÷ (\d+)\/(\d+)/);
  assert.notEqual(d1, d2);
  assert.equal(Number(n1) * Number(d2) * Number(different.answer.split("/")[1] || 1), Number(d1) * Number(n2) * Number(different.answer.split("/")[0]));

  const mixed = generateStageQuestion(byTopic["帶分數除法"].id, "easy", 0);
  assert.match(mixed.prompt, /\d+又\d+\/\d+ ÷ \d+/);
  assert.match(mixed.explanation, /假分數/);

  const same = generateStageQuestion(byTopic["同分母分數除法"].id, "easy", 0);
  const sameParts = same.prompt.match(/(\d+)\/(\d+) ÷ (\d+)\/(\d+)/);
  assert.equal(sameParts[2], sameParts[4]);
});

test("小數各 topic 不再共用小數÷整數模板", () => {
  const stageFor = (topic) => COURSE_STAGES.find((stage) => stage.topic === topic).id;
  assert.match(generateStageQuestion(stageFor("整數除以小數"), "easy", 0).prompt, /\d+ ÷ \d+\.\d+/);
  assert.match(generateStageQuestion(stageFor("小數除以整數"), "easy", 0).prompt, /\d+\.\d+ ÷ \d+/);
  assert.match(generateStageQuestion(stageFor("小數除以小數"), "easy", 0).prompt, /\d+\.\d+ ÷ 0\.\d+/);
  assert.match(generateStageQuestion(stageFor("商的小數點"), "easy", 0).prompt, /小數點後第一位/);
  assert.match(generateStageQuestion(stageFor("估算"), "easy", 0).prompt, /最接近的整十數/);
  assert.match(generateStageQuestion(stageFor("平均分配"), "easy", 0).prompt, /平均分成/);
});

test("比的記法、比值、化簡、連比具有不同運算契約", () => {
  const stageFor = (topic) => COURSE_STAGES.find((stage) => stage.topic === topic).id;
  assert.match(generateStageQuestion(stageFor("比的記法"), "easy", 0).prompt, /前項/);
  assert.match(generateStageQuestion(stageFor("比值"), "easy", 0).hint, /前項除以後項/);
  assert.match(generateStageQuestion(stageFor("比的化簡"), "easy", 1).prompt, /同乘 10 化為整數比/);
  const chain = generateStageQuestion(stageFor("連比"), "easy", 0);
  const [, first, second, third] = chain.prompt.match(/= (\d+)：(\d+)：(\d+)/);
  assert.equal(Number(chain.answer), Number(first) + Number(second) + Number(third));
});

test("圓、速率與比例尺的易混 topic 使用不同數學行為", () => {
  const stageFor = (topic, unitId) => COURSE_STAGES.find((stage) => stage.topic === topic && (!unitId || stage.unitId === unitId)).id;

  const pi = generateStageQuestion(stageFor("圓周率"), "easy", 0);
  const [, circumference, diameter] = pi.prompt.match(/圓周長 (\d+(?:\.\d+)?) 公分 ÷ 直徑 (\d+(?:\.\d+)?)/);
  assert.equal(Number(pi.answer), Number(circumference) / Number(diameter));

  assert.match(generateStageQuestion(stageFor("直徑與半徑"), "easy", 0).prompt, /半徑.+直徑/);
  assert.match(generateStageQuestion(stageFor("反推半徑", "kx-unit6"), "easy", 0).hint, /周長除以 3\.14/);
  assert.match(generateStageQuestion(stageFor("反推半徑", "kx-unit7"), "easy", 0).hint, /面積除以 3\.14/);

  assert.match(generateStageQuestion(stageFor("時速換算"), "medium", 0).prompt, /小時.+分鐘/);
  assert.match(generateStageQuestion(stageFor("分速換算"), "medium", 0).prompt, /分鐘.+秒/);
  assert.match(generateStageQuestion(stageFor("秒速換算"), "medium", 0).prompt, /秒.+分鐘/);

  assert.match(generateStageQuestion(stageFor("放大圖"), "easy", 0).concept, /enlarge-length/);
  assert.match(generateStageQuestion(stageFor("縮圖"), "easy", 0).concept, /shrink-length/);
  assert.match(generateStageQuestion(stageFor("比例尺"), "easy", 0).concept, /read-scale/);
});

test("每關每難度有 50 組唯一 prompt+answer，且同 index 完全穩定", () => {
  for (const stage of COURSE_STAGES) {
    for (const difficulty of STAGE_DIFFICULTIES) {
      const questions = generateStageQuestionPool(stage.id, difficulty);
      assert.equal(questions.length, 50);
      assert.equal(new Set(questions.map((question) => question.id)).size, 50);
      assert.equal(new Set(questions.map((question) => `${question.prompt}\0${question.answer}`)).size, 50, `${stage.id}/${difficulty} 變化不足`);
      for (const question of questions) {
        assert.equal(gradeAnswer(question, question.answer), true);
        assert.ok(!/^-|Infinity|NaN/.test(question.answer), `${question.id} 產生非法答案`);
        if (question.type === "choice") {
          assert.equal(question.choices.filter((choice) => mathematicallyCorrect(question, choice)).length, 1);
          assert.equal(new Set(question.choices).size, question.choices.length);
        }
      }
      for (const index of [0, 7, 23, 49]) {
        assert.deepEqual(
          generateStageQuestion(stage.id, difficulty, index),
          generateStageQuestion(stage.id, difficulty, index)
        );
      }
    }
  }
});

test("難度結構、payload schema、選擇題唯一正解皆維持相容", () => {
  const baseKeys = ["id", "stageId", "unitId", "difficulty", "concept", "type", "prompt", "answer", "hint", "explanation"];
  for (const stage of COURSE_STAGES) {
    const easy = generateStageQuestion(stage.id, "easy", 0);
    const medium = generateStageQuestion(stage.id, "medium", 0);
    const hard = generateStageQuestion(stage.id, "hard", 0);
    assert.equal(easy.difficulty, "easy");
    assert.equal(medium.difficulty, "medium");
    assert.equal(hard.difficulty, "hard");
    for (const question of [easy, medium, hard]) {
      assert.deepEqual(Object.keys(question).sort(), [...baseKeys, ...(question.type === "choice" ? ["choices"] : [])].sort());
      assert.equal(gradeAnswer(question, question.answer), true);
      assert.ok(!/Infinity|NaN/.test(question.answer));
      if (question.type === "choice") {
        assert.equal(question.choices.filter((choice) => mathematicallyCorrect(question, choice)).length, 1);
        assert.equal(new Set(question.choices).size, question.choices.length);
      }
    }
  }
});

test("同單元不同 stage 的 operation 與題目結構不高度相同", () => {
  const units = new Map();
  for (const stage of COURSE_STAGES) {
    const stages = units.get(stage.unitId) || [];
    stages.push(stage);
    units.set(stage.unitId, stages);
  }
  for (const stages of units.values()) {
    const operationSignatures = stages.map((stage) => STAGE_STRATEGY_METADATA[stage.id].operationKeys.join("|"));
    assert.ok(new Set(operationSignatures).size >= Math.ceil(stages.length * 0.6), `${stages[0].unitId} operation 過度重複`);
    const promptSignatures = stages.map((stage) =>
      `${generateStageQuestion(stage.id, "medium", 0).concept}|${generateStageQuestion(stage.id, "medium", 0).prompt.replace(/\d+(?:\.\d+)?/g, "#")}`
    );
    assert.ok(new Set(promptSignatures).size >= Math.ceil(stages.length * 0.6), `${stages[0].unitId} 題目結構過度重複`);
  }
});

test("正式題庫每次抽取實際可用題數且不重複", () => {
  for (const stage of COURSE_STAGES) {
    const first = selectStageQuestions({ stageId: stage.id, count: 10, rng: fixedRng([0, 0.7, 0.2]) });
    const second = selectStageQuestions({
      stageId: stage.id,
      count: 10,
      recentQuestionIds: first.map((question) => question.id),
      rng: fixedRng([0, 0.7, 0.2]),
    });
    assert.equal(first.length, 5);
    assert.equal(new Set(first.map((question) => question.id)).size, 5);
    assert.equal(new Set(second.map((question) => question.id)).size, 5);
  }
});

test("使用者體驗驗收：79 關各自提供不重複的人工審核題組", () => {
  for (const stage of COURSE_STAGES) {
    const questions = selectStageQuestions({
      stageId: stage.id,
      count: 10,
      rng: fixedRng([0.13, 0.79, 0.41, 0.92, 0.27]),
    });
    assert.equal(questions.length, 5);
    assert.equal(new Set(questions.map((question) => question.id)).size, 5);
    assert.ok(new Set(questions.map((question) => question.prompt)).size >= 5, `${stage.id} 題幹重複`);
    assert.ok(questions.every((question) => question.sourceMetadata?.reviewStatus === "approved"));
  }
});

test("錯誤參數維持既有防護", () => {
  const stageId = COURSE_STAGES[0].id;
  assert.throws(() => generateStageQuestion("missing", "easy", 0), RangeError);
  assert.throws(() => generateStageQuestion(stageId, "expert", 0), RangeError);
  assert.throws(() => generateStageQuestion(stageId, "easy", -1), RangeError);
  assert.throws(() => generateStageQuestionPool(stageId, "easy", 0), RangeError);
  assert.throws(() => selectStageQuestions({ stageId, count: 0 }), RangeError);
  assert.throws(() => selectStageQuestions({ stageId, rng: 1 }), TypeError);
});

test("OCR審核A類題保留在候選池，不會未經靜態題庫人工覆核進入學生題組", () => {
  const byStage = new Map();
  for (const question of APPROVED_CANDIDATE_QUESTIONS) {
    const list = byStage.get(question.stageId) || [];
    list.push(question);
    byStage.set(question.stageId, list);
  }
  for (const [stageId, candidates] of byStage.entries()) {
    for (const difficulty of ["easy", "medium", "hard"]) {
      const expected = candidates.filter((question) => question.difficulty === difficulty);
      const generated = generateStageQuestionPool(stageId, difficulty, 50);
      const official = getOfficialStageQuestionPool(stageId, difficulty, 50);
      assert.equal(generated.length, 50);
      assert.equal(official.length, 50 + expected.length);
      assert.ok(expected.every((question) => official.some((item) => item.id === question.id)));
    }
    const selected = selectStageQuestions({ stageId, rng: () => 0.5 });
    assert.equal(selected.some((question) => question.id.startsWith("candidate-")), false);
  }
});
