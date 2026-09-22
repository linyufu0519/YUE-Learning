// tests/curriculum.test.js
// 教材版本抽象層測試：版本清單/預設值、依版本取得單元、教學內容、
// 練習題庫對應（康軒第2單元沿用分數除法題庫），以及舊資料相容與合併偏好規則。
import test from "node:test";
import assert from "node:assert/strict";
import {
  VERSIONS,
  DEFAULT_VERSION,
  isValidVersion,
  getVersionLabel,
  getUnitsForVersion,
  getUnitByVersion,
  getPracticeBankKey,
  isPracticeAvailable,
  getAvailableQuestionCount,
  getQuestionBank,
  getLessonForVersion,
} from "../js/curriculum.js";
import { normalizeLearningState, defaultLearningState } from "../js/state-shape.js";

test("預設教材版本為康軒版", () => {
  assert.equal(DEFAULT_VERSION, "kangxuan");
  assert.ok(isValidVersion(DEFAULT_VERSION));
  assert.equal(VERSIONS.find((v) => v.id === "kangxuan").label, "康軒版");
  assert.equal(VERSIONS.find((v) => v.id === "hanlin").label, "翰林版");
});

test("isValidVersion 只接受 kangxuan/hanlin", () => {
  assert.equal(isValidVersion("kangxuan"), true);
  assert.equal(isValidVersion("hanlin"), true);
  assert.equal(isValidVersion("other"), false);
  assert.equal(isValidVersion(undefined), false);
});

test("getVersionLabel 回傳親子友善版本名稱", () => {
  assert.equal(getVersionLabel("kangxuan"), "康軒版");
  assert.equal(getVersionLabel("hanlin"), "翰林版");
});

test("getUnitsForVersion 依版本回傳對應課程單元，翰林版原有單元完整保留", () => {
  const kangxuanUnits = getUnitsForVersion("kangxuan");
  const hanlinUnits = getUnitsForVersion("hanlin");

  assert.equal(kangxuanUnits.length, 11); // 9 單元 + 複習（一）（二）
  assert.equal(hanlinUnits.length, 10); // 翰林版原本 10 個單元完整保留

  assert.ok(kangxuanUnits.some((u) => u.id === "kx-unit2" && u.title.includes("分數除法")));
  assert.ok(hanlinUnits.some((u) => u.id === "fraction-multiply"));
  assert.ok(hanlinUnits.some((u) => u.id === "fraction-divide"));
});

test("getUnitByVersion 可查詢單一單元", () => {
  assert.equal(getUnitByVersion("kangxuan", "kx-unit1").title.includes("最大公因數"), true);
  assert.equal(getUnitByVersion("hanlin", "fraction-multiply").title, "分數的乘法");
  assert.equal(getUnitByVersion("kangxuan", "not-exist"), undefined);
});

test("康軒版第2單元「分數除法」沿用既有 fraction-divide 動態題庫", () => {
  assert.equal(getPracticeBankKey("kangxuan", "kx-unit2"), "fraction-divide");
  assert.equal(isPracticeAvailable("kangxuan", "kx-unit2"), true);
  assert.ok(getAvailableQuestionCount("kangxuan", "kx-unit2") >= 30);
  assert.ok(getQuestionBank("kangxuan", "kx-unit2").length >= 30);

  // 翰林版對應單元題庫不變
  assert.equal(getPracticeBankKey("hanlin", "fraction-divide"), "fraction-divide");
  assert.deepEqual(
    getQuestionBank("kangxuan", "kx-unit2").map((q) => q.id).sort(),
    getQuestionBank("hanlin", "fraction-divide").map((q) => q.id).sort()
  );
});

test("康軒版尚未開放題庫的單元回傳空題庫且練習不可用", () => {
  assert.equal(getPracticeBankKey("kangxuan", "kx-unit1"), null);
  assert.equal(isPracticeAvailable("kangxuan", "kx-unit1"), false);
  assert.equal(getAvailableQuestionCount("kangxuan", "kx-unit1"), 0);
  assert.deepEqual(getQuestionBank("kangxuan", "kx-unit1"), []);
});

test("getLessonForVersion：翰林版直接查 lessons.js，康軒版單元2沿用翰林分數除法教學", () => {
  const hanlinLesson = getLessonForVersion("hanlin", "fraction-divide");
  const kangxuanUnit2Lesson = getLessonForVersion("kangxuan", "kx-unit2");
  assert.equal(kangxuanUnit2Lesson.title, hanlinLesson.title);
});

test("getLessonForVersion：康軒版其他單元有可閱讀的基礎教學（非敬請期待）", () => {
  for (const unit of getUnitsForVersion("kangxuan")) {
    if (unit.id === "kx-unit2") continue;
    const lesson = getLessonForVersion("kangxuan", unit.id);
    assert.ok(lesson, `${unit.id} 缺少教學內容`);
    assert.ok(lesson.intro && lesson.intro.length > 0);
    assert.ok(lesson.examples && lesson.examples.length >= 1);
  }
});

test("defaultLearningState 預設版本為康軒版，並具備兩個版本的進度桶", () => {
  const state = defaultLearningState();
  assert.equal(state.version, "kangxuan");
  assert.deepEqual(state.progress.kangxuan, { units: {}, wrongBook: [] });
  assert.deepEqual(state.progress.hanlin, { units: {}, wrongBook: [] });
});

test("normalizeLearningState：舊資料（無 version/progress）自動遷移到 hanlin，版本偏好預設康軒版", () => {
  const legacy = {
    streak: { count: 3, lastDate: "2026-01-01" },
    units: { "fraction-multiply": { attempts: 2, correct: 1, bestAccuracy: 50, lastDate: "2026-01-01", completedQuestionIds: ["fm-01"] } },
    wrongBook: [{ unitId: "fraction-multiply", questionId: "fm-02", date: "2026-01-01" }],
    rewards: { xp: 30 },
  };
  const state = normalizeLearningState(legacy);
  assert.equal(state.version, "kangxuan");
  assert.equal(state.progress.hanlin.units["fraction-multiply"].attempts, 2);
  assert.equal(state.progress.hanlin.wrongBook.length, 1);
  assert.deepEqual(state.progress.kangxuan, { units: {}, wrongBook: [] });
  assert.equal(state.units, undefined);
  assert.equal(state.wrongBook, undefined);
});

test("normalizeLearningState：不合法的版本字串會回退為康軒版", () => {
  const state = normalizeLearningState({ version: "other-textbook" });
  assert.equal(state.version, "kangxuan");
});

test("normalizeLearningState：已是新結構的資料保持不變（可重複正規化）", () => {
  const already = {
    version: "hanlin",
    streak: { count: 1, lastDate: "2026-01-01" },
    progress: {
      kangxuan: { units: {}, wrongBook: [] },
      hanlin: { units: { "fraction-divide": { attempts: 1, correct: 1, bestAccuracy: 100, lastDate: "2026-01-01", completedQuestionIds: ["fd-01"] } }, wrongBook: [] },
    },
    rewards: { xp: 15 },
  };
  const state = normalizeLearningState(already);
  assert.equal(state.version, "hanlin");
  assert.equal(state.progress.hanlin.units["fraction-divide"].attempts, 1);
  assert.deepEqual(state.progress.kangxuan, { units: {}, wrongBook: [] });
});
