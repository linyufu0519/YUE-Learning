import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PARENT_PASSWORD,
  verifyParentPassword,
} from "../js/parent-auth.js";

test("預設家長密碼為 8888", () => {
  assert.equal(DEFAULT_PARENT_PASSWORD, "8888");
});

test("正確密碼可通過家長驗證", () => {
  assert.equal(verifyParentPassword("8888"), true);
  assert.equal(verifyParentPassword(" 8888 "), true);
});

test("錯誤或空白密碼無法通過家長驗證", () => {
  assert.equal(verifyParentPassword("1234"), false);
  assert.equal(verifyParentPassword(""), false);
  assert.equal(verifyParentPassword(null), false);
});
