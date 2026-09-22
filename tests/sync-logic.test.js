// tests/sync-logic.test.js
import test from "node:test";
import assert from "node:assert/strict";
import {
  mergeState,
  mergeWrongBooks,
  buildCloudPayload,
  resolveSyncMode,
  describeSyncStatus,
  mapAuthError,
} from "../js/sync-logic.js";
import { normalizeRewards } from "../js/rewards.js";

function progressWith(units = {}, wrongBook = []) {
  return { units, wrongBook };
}

test("resolveSyncMode 依設定狀態回傳離線或雲端模式", () => {
  assert.equal(resolveSyncMode(false), "offline-no-config");
  assert.equal(resolveSyncMode(true), "cloud");
});

test("describeSyncStatus 各狀態回傳親子友善繁體中文文字", () => {
  assert.match(describeSyncStatus({ mode: "offline-no-config" }), /離線模式/);
  assert.match(describeSyncStatus({ mode: "offline" }), /尚未登入/);
  assert.match(describeSyncStatus({ mode: "signed-out" }), /已登出/);
  assert.match(describeSyncStatus({ mode: "syncing", user: { email: "a@b.com" } }), /同步中.*a@b\.com/);
  assert.match(describeSyncStatus({ mode: "synced", user: { email: "a@b.com" } }), /同步完成.*a@b\.com/);
  assert.match(describeSyncStatus({ mode: "error", error: "網路中斷" }), /網路中斷/);
  assert.match(describeSyncStatus({}), /初始化/);
});

test("mapAuthError 轉換常見 Firebase 錯誤代碼", () => {
  assert.match(mapAuthError({ code: "auth/wrong-password" }), /密碼錯誤|不正確/);
  assert.match(mapAuthError({ code: "auth/email-already-in-use" }), /已經註冊/);
  assert.match(mapAuthError({ code: "auth/weak-password" }), /6 碼/);
  assert.match(mapAuthError({ code: "auth/unknown-x", message: "自訂錯誤" }), /自訂錯誤/);
});

test("buildCloudPayload 附加 updatedAt 並保留原始欄位", () => {
  const state = {
    version: "kangxuan",
    streak: { count: 3, lastDate: "2026-01-01" },
    progress: { kangxuan: progressWith(), hanlin: progressWith() },
    rewards: normalizeRewards(),
  };
  const payload = buildCloudPayload(state, "2026-01-02T00:00:00.000Z");
  assert.equal(payload.updatedAt, "2026-01-02T00:00:00.000Z");
  assert.equal(payload.streak.count, 3);
});

test("mergeWrongBooks 同一題只保留日期較新的一筆", () => {
  const local = [
    { unitId: "u1", questionId: "q1", date: "2026-01-01", yourAnswer: "1/2" },
  ];
  const cloud = [
    { unitId: "u1", questionId: "q1", date: "2026-01-05", yourAnswer: "1/3" },
    { unitId: "u1", questionId: "q2", date: "2026-01-02", yourAnswer: "2/3" },
  ];
  const merged = mergeWrongBooks(local, cloud);
  assert.equal(merged.length, 2);
  const q1 = merged.find((w) => w.questionId === "q1");
  assert.equal(q1.date, "2026-01-05");
  assert.equal(q1.yourAnswer, "1/3");
});

test("mergeState：雲端無資料（首次登入）時直接沿用本機資料（含版本偏好）", () => {
  const local = {
    version: "hanlin",
    streak: { count: 5, lastDate: "2026-02-01" },
    progress: {
      hanlin: progressWith({
        "frac-mul": { attempts: 10, correct: 8, bestAccuracy: 80, lastDate: "2026-02-01", completedQuestionIds: ["q1", "q2"] },
      }),
      kangxuan: progressWith(),
    },
    rewards: normalizeRewards({ xp: 100 }),
  };
  const merged = mergeState(local, null, "2026-02-01");
  assert.equal(merged.version, "hanlin");
  assert.equal(merged.streak.count, 5);
  assert.equal(merged.progress.hanlin.units["frac-mul"].attempts, 10);
  assert.equal(merged.rewards.xp, 100);
  assert.ok(merged.updatedAt);
});

test("mergeState：本機無資料（新裝置）時直接沿用雲端資料（含版本偏好）", () => {
  const cloud = {
    version: "kangxuan",
    streak: { count: 3, lastDate: "2026-02-01" },
    progress: {
      kangxuan: progressWith(
        { "frac-div": { attempts: 6, correct: 5, bestAccuracy: 83, lastDate: "2026-02-01", completedQuestionIds: ["q9"] } },
        [{ unitId: "frac-div", questionId: "q9", date: "2026-02-01" }]
      ),
      hanlin: progressWith(),
    },
    rewards: normalizeRewards({ xp: 40 }),
  };
  const merged = mergeState(null, cloud, "2026-02-01");
  assert.equal(merged.version, "kangxuan");
  assert.equal(merged.streak.count, 3);
  assert.equal(merged.progress.kangxuan.units["frac-div"].attempts, 6);
  assert.equal(merged.progress.kangxuan.wrongBook.length, 1);
  assert.equal(merged.rewards.xp, 40);
});

test("mergeState：兩邊都有資料時，單元進度採聯集/取較大值，不遺失任何一邊", () => {
  const local = {
    version: "kangxuan",
    streak: { count: 2, lastDate: "2026-02-01" },
    progress: {
      kangxuan: progressWith(
        {
          "frac-mul": {
            attempts: 10,
            correct: 8,
            bestAccuracy: 80,
            lastDate: "2026-02-01",
            completedQuestionIds: ["q1", "q2", "q3"],
          },
        },
        [{ unitId: "frac-mul", questionId: "q4", date: "2026-02-01" }]
      ),
      hanlin: progressWith(),
    },
    rewards: normalizeRewards({ xp: 50, stars: 2, badges: ["第一顆星"] }),
  };
  const cloud = {
    version: "kangxuan",
    streak: { count: 6, lastDate: "2026-02-03" },
    progress: {
      kangxuan: progressWith(
        {
          "frac-mul": {
            attempts: 12,
            correct: 11,
            bestAccuracy: 91,
            lastDate: "2026-02-03",
            completedQuestionIds: ["q1", "q5"],
          },
        },
        [{ unitId: "frac-mul", questionId: "q4", date: "2026-01-30" }]
      ),
      hanlin: progressWith(),
    },
    rewards: normalizeRewards({ xp: 70, stars: 1, badges: ["穩定練習家"] }),
  };
  const merged = mergeState(local, cloud, "2026-02-03");

  // streak 取日期較新的一筆
  assert.equal(merged.streak.count, 6);
  assert.equal(merged.streak.lastDate, "2026-02-03");

  // 單元：attempts/correct/bestAccuracy 取較大值，completedQuestionIds 聯集不遺失
  const unit = merged.progress.kangxuan.units["frac-mul"];
  assert.equal(unit.attempts, 12);
  assert.equal(unit.correct, 11);
  assert.equal(unit.bestAccuracy, 91);
  assert.deepEqual([...unit.completedQuestionIds].sort(), ["q1", "q2", "q3", "q5"]);

  // 錯題本：同一題保留日期較新（本機 2026-02-01 比雲端 2026-01-30 新）
  assert.equal(merged.progress.kangxuan.wrongBook.length, 1);
  assert.equal(merged.progress.kangxuan.wrongBook[0].date, "2026-02-01");

  // 獎勵：xp/stars 取較大值，徽章聯集
  assert.equal(merged.rewards.xp, 70);
  assert.equal(merged.rewards.stars, 2);
  assert.deepEqual([...merged.rewards.badges].sort(), ["穩定練習家", "第一顆星"]);
});

test("mergeState：不會因為合併而遺失任一邊獨有的單元，且分版本進度互不污染", () => {
  const local = {
    version: "kangxuan",
    streak: { count: 1, lastDate: "2026-03-01" },
    progress: {
      kangxuan: progressWith({ "kx-unit2": { attempts: 3, correct: 2, bestAccuracy: 66, lastDate: "2026-03-01", completedQuestionIds: ["a"] } }),
      hanlin: progressWith(),
    },
    rewards: normalizeRewards(),
  };
  const cloud = {
    version: "kangxuan",
    streak: { count: 1, lastDate: "2026-03-01" },
    progress: {
      kangxuan: progressWith(),
      hanlin: progressWith({ "fraction-divide": { attempts: 4, correct: 4, bestAccuracy: 100, lastDate: "2026-03-01", completedQuestionIds: ["b"] } }),
    },
    rewards: normalizeRewards(),
  };
  const merged = mergeState(local, cloud, "2026-03-01");
  assert.ok(merged.progress.kangxuan.units["kx-unit2"]);
  assert.ok(merged.progress.hanlin.units["fraction-divide"]);
  // 兩個版本的進度桶不會互相混入對方單元
  assert.equal(merged.progress.kangxuan.units["fraction-divide"], undefined);
  assert.equal(merged.progress.hanlin.units["kx-unit2"], undefined);
});

test("mergeState：版本偏好以本機（目前裝置正在使用的版本）為優先", () => {
  const local = {
    version: "hanlin",
    streak: { count: 1, lastDate: "2026-03-01" },
    progress: { kangxuan: progressWith(), hanlin: progressWith() },
    rewards: normalizeRewards(),
  };
  const cloud = {
    version: "kangxuan",
    streak: { count: 1, lastDate: "2026-03-01" },
    progress: { kangxuan: progressWith(), hanlin: progressWith() },
    rewards: normalizeRewards(),
  };
  const merged = mergeState(local, cloud, "2026-03-01");
  assert.equal(merged.version, "hanlin");
});

test("mergeState：本機缺少版本欄位（舊資料）時改採雲端版本偏好", () => {
  const local = {
    streak: { count: 1, lastDate: "2026-03-01" },
    progress: { kangxuan: progressWith(), hanlin: progressWith() },
    rewards: normalizeRewards(),
  };
  const cloud = {
    version: "hanlin",
    streak: { count: 1, lastDate: "2026-03-01" },
    progress: { kangxuan: progressWith(), hanlin: progressWith() },
    rewards: normalizeRewards(),
  };
  const merged = mergeState(local, cloud, "2026-03-01");
  assert.equal(merged.version, "hanlin");
});

test("mergeState：本機為舊版扁平資料結構時，會自動遷移到 hanlin 進度再合併", () => {
  const local = {
    streak: { count: 1, lastDate: "2026-03-01" },
    units: { "fraction-multiply": { attempts: 3, correct: 2, bestAccuracy: 66, lastDate: "2026-03-01", completedQuestionIds: ["a"] } },
    wrongBook: [],
    rewards: normalizeRewards(),
  };
  const cloud = {
    version: "kangxuan",
    streak: { count: 1, lastDate: "2026-03-01" },
    progress: { kangxuan: progressWith(), hanlin: progressWith() },
    rewards: normalizeRewards(),
  };
  const merged = mergeState(local, cloud, "2026-03-01");
  assert.ok(merged.progress.hanlin.units["fraction-multiply"]);
});

test("mergeState：今天的每日任務進度合併採較大值與任務聯集", () => {
  const today = "2026-04-01";
  // 注意：這裡刻意不透過 normalizeRewards() 建立測試資料，因為 normalizeRewards()
  // 內部用「真正的今天」正規化 daily，會把注入的測試日期洗掉；直接給 mergeState
  // 未正規化的原始資料，正是它在實際登入合併情境下會收到的資料型態。
  const local = {
    version: "kangxuan",
    streak: { count: 1, lastDate: today },
    progress: { kangxuan: progressWith(), hanlin: progressWith() },
    rewards: {
      xp: 0,
      stars: 0,
      badges: [],
      lessonReads: {},
      recentQuestionIds: {},
      daily: { date: today, practiceCount: 5, lessonReadCount: 0, wrongFixedCount: 0, completedMissionIds: ["practice-5"] },
    },
  };
  const cloud = {
    version: "kangxuan",
    streak: { count: 1, lastDate: today },
    progress: { kangxuan: progressWith(), hanlin: progressWith() },
    rewards: {
      xp: 0,
      stars: 0,
      badges: [],
      lessonReads: {},
      recentQuestionIds: {},
      daily: { date: today, practiceCount: 2, lessonReadCount: 1, wrongFixedCount: 0, completedMissionIds: ["read-lesson"] },
    },
  };
  const merged = mergeState(local, cloud, today);
  assert.equal(merged.rewards.daily.practiceCount, 5);
  assert.equal(merged.rewards.daily.lessonReadCount, 1);
  assert.deepEqual(
    [...merged.rewards.daily.completedMissionIds].sort(),
    ["practice-5", "read-lesson"]
  );
});
