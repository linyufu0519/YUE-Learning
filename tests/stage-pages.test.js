import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("首頁具備79關學習地圖容器與四種狀態渲染", async () => {
  const [html, js] = await Promise.all([source("index.html"), source("js/home.js")]);
  assert.match(html, /id="unit-grid"/);
  assert.match(html, /id="units-heading"/);
  assert.match(js, /renderStageMap/);
  for (const status of ["locked", "available", "in-progress", "completed"]) {
    assert.ok(js.includes(status), `缺少 ${status} 狀態`);
  }
  assert.match(js, /lesson\.html\?stage=/);
  assert.match(js, /practice\.html\?stage=/);
});

test("家長頁關卡摘要函式位於render外層且顯示單元獎勵", async () => {
  const [html, js] = await Promise.all([source("parent.html"), source("js/parent.js")]);
  assert.match(html, /id="semester-stage-summary"/);
  const renderEnd = js.indexOf("\nfunction renderSemesterProgress");
  assert.ok(renderEnd > js.indexOf("function render()"), "關卡摘要函式應定義於 render 外層");
  assert.match(js, /79/);
  assert.match(js, /rewardClaimed/);
  assert.match(js, /completionXp/);
  assert.match(js, /需要加強的主題/);
});

test("舊每日任務資料保留，但康軒畫面使用本關任務與獨立學期XP", async () => {
  const [home, storage, shape] = await Promise.all([
    source("js/home.js"),
    source("js/storage.js"),
    source("js/state-shape.js"),
  ]);
  assert.match(shape, /semesterProgress/);
  assert.match(storage, /legacyXp/);
  assert.match(storage, /state\.version === "kangxuan" \? semesterXp : rewards\.xp/);
  assert.match(home, /目前關卡的三項任務/);
  assert.match(home, /rewards\.missions/);
});
