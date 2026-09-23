import test from "node:test";
import assert from "node:assert/strict";
import { COURSE_STAGES } from "../js/course-stages.js";
import {
  STATIC_STAGE_QUESTIONS,
  getStaticStageQuestions,
  selectStaticStageQuestions,
} from "../js/static-question-bank.js";

const choiceCue = /下列哪(?:一)?個|何者|請選出|哪一項|任一/;
const forbidden = /小於自己的因數|先完成「|再判斷答案|比較同學寫的/;

test("正式靜態題庫涵蓋79關且每關5至10題", () => {
  assert.equal(COURSE_STAGES.length, 79);
  assert.equal(STATIC_STAGE_QUESTIONS.length, 395);
  for (const stage of COURSE_STAGES) {
    const questions = getStaticStageQuestions(stage.id);
    assert.ok(questions.length >= 5 && questions.length <= 10, `${stage.id}: ${questions.length}`);
    assert.ok(questions.every((question) => question.stageId === stage.id));
    assert.ok(questions.every((question) => question.unitId === stage.unitId));
  }
});

test("正式題目ID、欄位與來源metadata完整", () => {
  assert.equal(new Set(STATIC_STAGE_QUESTIONS.map(({ id }) => id)).size, STATIC_STAGE_QUESTIONS.length);
  for (const question of STATIC_STAGE_QUESTIONS) {
    for (const key of ["id", "stageId", "unitId", "type", "prompt", "answer", "hint", "explanation", "concept"]) {
      assert.ok(String(question[key] ?? "").trim(), `${question.id} 缺少 ${key}`);
    }
    assert.equal(question.sourceMetadata?.source, "expert-authored-static-bank", question.id);
    assert.equal(question.sourceMetadata?.reviewStatus, "approved", question.id);
  }
});

test("choice與input資料契約一致", () => {
  for (const question of STATIC_STAGE_QUESTIONS) {
    if (question.type === "choice") {
      assert.ok(Array.isArray(question.choices) && question.choices.length >= 2, question.id);
      assert.equal(new Set(question.choices.map(String)).size, question.choices.length, question.id);
      assert.equal(question.choices.map(String).filter((choice) => choice === String(question.answer)).length, 1, question.id);
    } else {
      assert.equal(question.type, "input", question.id);
      assert.equal(Object.hasOwn(question, "choices"), false, question.id);
      assert.doesNotMatch(question.prompt, choiceCue, question.id);
    }
    if (choiceCue.test(question.prompt)) assert.equal(question.type, "choice", question.id);
  }
});

test("學生題幹不含已知機械模板或歧義句型", () => {
  for (const question of STATIC_STAGE_QUESTIONS) {
    assert.doesNotMatch(question.prompt, forbidden, question.id);
    assert.doesNotMatch(question.hint, forbidden, question.id);
  }
});

test("正式選題不重複湊滿10題並避開近期題優先", () => {
  const stageId = COURSE_STAGES[0].id;
  const bank = getStaticStageQuestions(stageId);
  const selected = selectStaticStageQuestions({
    stageId,
    count: 10,
    recentQuestionIds: [bank[0].id],
    rng: () => 0.5,
  });
  assert.equal(selected.length, 5);
  assert.equal(new Set(selected.map(({ id }) => id)).size, 5);
  assert.equal(selected.at(-1).id, bank[0].id);
});
