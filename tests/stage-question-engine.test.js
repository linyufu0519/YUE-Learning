import test from "node:test";
import assert from "node:assert/strict";
import { COURSE_STAGES } from "../js/course-stages.js";
import {
  STAGE_DIFFICULTIES,
  generateStageQuestion,
  generateStageQuestionPool,
  selectStageQuestions,
} from "../js/stage-question-engine.js";

function fixedRng(values) {
  let position = 0;
  return () => values[position++ % values.length];
}

test("79 關的每種難度都能產生三種概念與必要題目欄位", () => {
  for (const stage of COURSE_STAGES) {
    for (const difficulty of STAGE_DIFFICULTIES) {
      const questions = [0, 1, 2].map((index) => generateStageQuestion(stage.id, difficulty, index));
      assert.equal(new Set(questions.map((question) => question.concept)).size, 3, `${stage.id}/${difficulty} 概念不足`);
      for (const question of questions) {
        for (const key of ["id", "stageId", "unitId", "difficulty", "type", "prompt", "answer", "hint", "explanation"]) {
          assert.ok(question[key] !== undefined && question[key] !== "", `${question.id} 缺少 ${key}`);
        }
        assert.ok(["choice", "input"].includes(question.type));
        if (question.type === "choice") {
          assert.equal(question.choices.filter((choice) => choice === question.answer).length, 1);
          assert.equal(new Set(question.choices).size, question.choices.length);
        }
      }
    }
  }
});

test("每關、每難度可產生至少 50 題唯一且答案與解析皆不同的有效題目", () => {
  for (const stage of COURSE_STAGES) {
    for (const difficulty of STAGE_DIFFICULTIES) {
      const questions = generateStageQuestionPool(stage.id, difficulty);
      assert.equal(questions.length, 50);
      assert.equal(new Set(questions.map((question) => question.id)).size, 50);
      assert.equal(new Set(questions.map((question) => question.answer)).size, 50);
      assert.equal(new Set(questions.map((question) => question.explanation)).size, 50);
    }
  }
});

test("每次抽取 10 題不重複，且優先避開最近出題", () => {
  const stageId = COURSE_STAGES[0].id;
  const first = selectStageQuestions({ stageId, difficulty: "medium", count: 10, rng: fixedRng([0]) });
  const second = selectStageQuestions({
    stageId,
    difficulty: "medium",
    count: 10,
    recentQuestionIds: first.map((question) => question.id),
    rng: fixedRng([0]),
  });
  assert.equal(new Set(first.map((question) => question.id)).size, 10);
  assert.equal(new Set(second.map((question) => question.id)).size, 10);
  assert.equal(second.some((question) => first.some((recent) => recent.id === question.id)), false);
});
