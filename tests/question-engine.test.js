import test from "node:test";
import assert from "node:assert/strict";
import {
  chooseSmartDifficulty,
  getAvailableQuestionCount,
  selectPracticeQuestions,
} from "../js/question-engine.js";
import { gradeAnswer } from "../js/logic.js";

function fixedRng(values) {
  let index = 0;
  return () => values[index++ % values.length];
}

test("已開放單元題庫至少 30 題", () => {
  assert.ok(getAvailableQuestionCount("kx-gcf-lcm") >= 30);
  assert.ok(getAvailableQuestionCount("kx-quantity-relations") >= 30);
  assert.ok(getAvailableQuestionCount("kx-decimal-division") >= 30);
  assert.ok(getAvailableQuestionCount("fraction-multiply") >= 30);
  assert.ok(getAvailableQuestionCount("fraction-divide") >= 30);
});

test("可依難度篩選出題", () => {
  const questions = selectPracticeQuestions({
    unitId: "fraction-multiply",
    difficulty: "hard",
    count: 6,
    rng: fixedRng([0.1, 0.7, 0.3]),
  });
  assert.equal(questions.length, 6);
  assert.ok(questions.every((q) => q.difficulty === "hard"));
});

test("康軒第1單元題庫涵蓋 easy/medium/hard 並可隨機出題", () => {
  for (const difficulty of ["easy", "medium", "hard"]) {
    const questions = selectPracticeQuestions({
      unitId: "kx-gcf-lcm",
      difficulty,
      count: 5,
      rng: fixedRng([0.2, 0.8, 0.4]),
    });
    assert.equal(questions.length, 5);
    assert.ok(questions.every((q) => q.difficulty === difficulty));
  }
});

test("康軒第1單元數值輸入題可正確判定答案", () => {
  const [question] = selectPracticeQuestions({
    unitId: "kx-gcf-lcm",
    difficulty: "hard",
    count: 1,
    rng: fixedRng([0]),
  });
  assert.equal(gradeAnswer({ type: "input", answer: question.answer }, question.answer), true);
});

test("康軒第3單元題庫涵蓋 easy/medium/hard 並可隨機出題", () => {
  for (const difficulty of ["easy", "medium", "hard"]) {
    const questions = selectPracticeQuestions({
      unitId: "kx-quantity-relations",
      difficulty,
      count: 10,
      rng: fixedRng([0.1, 0.5, 0.9]),
    });
    assert.equal(questions.length, 10);
    assert.ok(questions.every((q) => q.difficulty === difficulty));
  }
});

test("康軒第4單元題庫涵蓋 easy/medium/hard 並可隨機出題", () => {
  for (const difficulty of ["easy", "medium", "hard"]) {
    const questions = selectPracticeQuestions({
      unitId: "kx-decimal-division",
      difficulty,
      count: 10,
      rng: fixedRng([0.3, 0.7, 0.2]),
    });
    assert.equal(questions.length, 10);
    assert.ok(questions.every((q) => q.difficulty === difficulty));
  }
});

test("小數除法輸入題支援等值小數答案", () => {
  assert.equal(gradeAnswer({ type: "input", answer: "1.5" }, "1.50"), true);
  assert.equal(gradeAnswer({ type: "input", answer: "0.75" }, ".75"), true);
});

test("抽題會避開最近出現題目", () => {
  const first = selectPracticeQuestions({
    unitId: "fraction-divide",
    difficulty: "easy",
    count: 3,
    rng: fixedRng([0, 0, 0]),
  });
  const second = selectPracticeQuestions({
    unitId: "fraction-divide",
    difficulty: "easy",
    count: 3,
    recentQuestionIds: first.map((q) => q.id),
    rng: fixedRng([0, 0, 0]),
  });
  assert.equal(second.some((q) => first.map((x) => x.id).includes(q.id)), false);
});

test("智慧練習會依最近表現挑選難度", () => {
  assert.equal(chooseSmartDifficulty({ attempts: 0, accuracy: 0 }), "easy");
  assert.equal(chooseSmartDifficulty({ attempts: 8, accuracy: 70 }), "medium");
  assert.equal(chooseSmartDifficulty({ attempts: 10, accuracy: 90 }), "hard");
});

test("動態題目仍支援等值分數判定", () => {
  const [question] = selectPracticeQuestions({
    unitId: "fraction-multiply",
    difficulty: "easy",
    count: 1,
    rng: fixedRng([0]),
  });
  if (question.answer === "1/3") {
    assert.equal(gradeAnswer({ type: "input", answer: question.answer }, "2/6"), true);
  } else {
    assert.equal(gradeAnswer({ type: "input", answer: "1/3" }, "2/6"), true);
  }
});
