import { STATIC_QUESTIONS_UNIT_1_3 } from "./static-banks/unit1-3.js";
import { STATIC_QUESTIONS_UNIT_4_5_REVIEW_1 } from "./static-banks/unit4-5-review1.js";
import { STATIC_QUESTIONS_UNIT_6_7 } from "./static-banks/unit6-7.js";
import { STATIC_QUESTIONS_UNIT_8_9_REVIEW_2 } from "./static-banks/unit8-9-review2.js";

export const STATIC_STAGE_QUESTIONS = Object.freeze([
  ...STATIC_QUESTIONS_UNIT_1_3,
  ...STATIC_QUESTIONS_UNIT_4_5_REVIEW_1,
  ...STATIC_QUESTIONS_UNIT_6_7,
  ...STATIC_QUESTIONS_UNIT_8_9_REVIEW_2,
].map((question) => {
  const normalized = {
    ...question,
    sourceMetadata: Object.freeze({ ...question.sourceMetadata }),
  };
  if (question.choices) normalized.choices = Object.freeze([...question.choices]);
  return Object.freeze(normalized);
}));

const QUESTIONS_BY_STAGE = new Map();
for (const question of STATIC_STAGE_QUESTIONS) {
  const questions = QUESTIONS_BY_STAGE.get(question.stageId) || [];
  questions.push(question);
  QUESTIONS_BY_STAGE.set(question.stageId, questions);
}

export function getStaticStageQuestions(stageId) {
  return [...(QUESTIONS_BY_STAGE.get(stageId) || [])];
}

function shuffle(items, rng) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(rng() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function selectStaticStageQuestions({
  stageId,
  count = 10,
  recentQuestionIds = [],
  rng = Math.random,
}) {
  if (!Number.isInteger(count) || count < 1) throw new RangeError("count 必須是正整數。");
  if (typeof rng !== "function") throw new TypeError("rng 必須是函式。");
  const bank = getStaticStageQuestions(stageId);
  if (!bank.length) throw new RangeError(`找不到已審核靜態題庫：${stageId}`);
  const recent = new Set(recentQuestionIds);
  const fresh = shuffle(bank.filter((question) => !recent.has(question.id)), rng);
  const repeated = shuffle(bank.filter((question) => recent.has(question.id)), rng);
  return [...fresh, ...repeated].slice(0, Math.min(count, bank.length));
}

export function getStaticStageQuestionCount(stageId) {
  return QUESTIONS_BY_STAGE.get(stageId)?.length || 0;
}
