import test from "node:test";
import assert from "node:assert/strict";
import { isCurrentAuthRequest } from "../js/sync-manager.js";

test("Auth fetch 成功或失敗回應只可更新目前登入帳號的同步狀態", () => {
  assert.equal(isCurrentAuthRequest(2, "user-b", 2, "user-b"), true);
  assert.equal(isCurrentAuthRequest(1, "user-a", 2, "user-b"), false);
  assert.equal(isCurrentAuthRequest(2, "user-a", 2, "user-b"), false);
});
