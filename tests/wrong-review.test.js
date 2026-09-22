import test from "node:test";
import assert from "node:assert/strict";
import { createWrongReviewQuestions, getWrongReviewKey } from "../js/wrong-review.js";

const wrongBook = [
  {
    unitId: "kx-unit1",
    questionId: "kx1-prime-easy-1",
    prompt: "17 是質數還是合數？",
    correctAnswer: "質數",
    explanation: "17 只有 1 和 17 兩個因數。",
  },
  {
    unitId: "kx-unit4",
    questionId: "kx4-decimal-medium-2",
    prompt: "3 ÷ 0.2 = ?",
    correctAnswer: "15",
    explanation: "被除數和除數同乘 10。",
  },
];

test("錯題複習可將整份錯題轉為可作答題目，且保留單元與答案解析", () => {
  const questions = createWrongReviewQuestions(wrongBook);
  assert.equal(questions.length, 2);
  assert.deepEqual(
    {
      id: questions[0].id,
      unitId: questions[0].unitId,
      type: questions[0].type,
      answer: questions[0].answer,
      explanation: questions[0].explanation,
    },
    {
      id: "kx1-prime-easy-1",
      unitId: "kx-unit1",
      type: "input",
      answer: "質數",
      explanation: "17 只有 1 和 17 兩個因數。",
    }
  );
});

test("錯題複習可依版本內唯一鍵選擇單一題目", () => {
  const selected = createWrongReviewQuestions(wrongBook, getWrongReviewKey(wrongBook[1]));
  assert.equal(selected.length, 1);
  assert.equal(selected[0].unitId, "kx-unit4");
  assert.equal(selected[0].id, "kx4-decimal-medium-2");
});

test("空錯題本與不完整舊資料可安全處理", () => {
  assert.deepEqual(createWrongReviewQuestions([]), []);
  assert.deepEqual(createWrongReviewQuestions(null), []);
  assert.deepEqual(createWrongReviewQuestions([{ unitId: "kx-unit1" }]), []);
});
