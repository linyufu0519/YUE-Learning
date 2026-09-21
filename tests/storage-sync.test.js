// tests/storage-sync.test.js
// 驗證 storage.js 新增的雲端同步相關掛勾：onStateChange 通知、resetState 清空後
// 也會通知（讓已登入雲端的裝置把「清空」推到 Firestore）、replaceState 合併寫回。
import test from "node:test";
import assert from "node:assert/strict";

function makeMemoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
  };
}

globalThis.localStorage = makeMemoryStorage();

const { recordAnswer, resetState, replaceState, loadState, onStateChange } = await import(
  "../js/storage.js"
);

test("onStateChange 會在 recordAnswer 之後收到最新狀態", () => {
  resetState();
  const received = [];
  const unsubscribe = onStateChange((state) => received.push(state));

  recordAnswer({
    unitId: "fraction-multiply",
    questionId: "sync-q1",
    prompt: "1/2 x 2/3",
    isCorrect: true,
    yourAnswer: "1/3",
    correctAnswer: "1/3",
    explanation: "分子乘分子、分母乘分母。",
  });

  assert.equal(received.length, 1);
  assert.equal(received[0].units["fraction-multiply"].attempts, 1);
  unsubscribe();
});

test("resetState 也會觸發 onStateChange（清空要能同步到雲端）", () => {
  resetState();
  recordAnswer({
    unitId: "fraction-divide",
    questionId: "sync-q2",
    prompt: "1/2 ÷ 1/3",
    isCorrect: false,
    yourAnswer: "1/2",
    correctAnswer: "3/2",
    explanation: "除以分數等於乘以其倒數。",
  });

  const received = [];
  const unsubscribe = onStateChange((state) => received.push(state));
  const cleared = resetState();

  assert.equal(received.length, 1);
  assert.deepEqual(received[0].units, {});
  assert.deepEqual(received[0].wrongBook, []);
  assert.deepEqual(cleared.units, {});
  unsubscribe();
});

test("unsubscribe 之後不再收到通知", () => {
  resetState();
  const received = [];
  const unsubscribe = onStateChange((state) => received.push(state));
  unsubscribe();

  recordAnswer({
    unitId: "fraction-multiply",
    questionId: "sync-q3",
    prompt: "測試",
    isCorrect: true,
    yourAnswer: "1/3",
    correctAnswer: "1/3",
    explanation: "",
  });

  assert.equal(received.length, 0);
});

test("replaceState 會補齊缺少欄位並正規化 rewards（模擬雲端合併寫回）", () => {
  const merged = replaceState({
    streak: { count: 9, lastDate: "2026-05-01" },
    units: { "fraction-multiply": { attempts: 20, correct: 18, bestAccuracy: 90, lastDate: "2026-05-01", completedQuestionIds: ["a", "b"] } },
    // 故意省略 wrongBook 與 rewards，測試補齊
  });

  assert.equal(merged.streak.count, 9);
  assert.deepEqual(merged.wrongBook, []);
  assert.equal(typeof merged.rewards.xp, "number");
  assert.ok(merged.rewards.daily);

  const persisted = loadState();
  assert.equal(persisted.streak.count, 9);
  assert.equal(persisted.units["fraction-multiply"].attempts, 20);
});
