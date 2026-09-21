import test from "node:test";
import assert from "node:assert/strict";
import { UNITS } from "../js/data.js";
import { getLesson } from "../js/lessons.js";

test("所有單元都有教學內容", () => {
  for (const unit of UNITS) {
    const lesson = getLesson(unit.id);
    assert.ok(lesson, `${unit.id} 缺少教學`);
    assert.ok(lesson.intro.length > 0);
    assert.ok(lesson.examples.length >= 1);
  }
});
