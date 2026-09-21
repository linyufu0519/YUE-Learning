# 林小玥六年級數學學習站（翰林版）— MVP

一個**完全離線、免後端**的國小六年級數學學習網站，對象為翰林版六年級學生。使用純 HTML / CSS / JavaScript（ES Modules）打造，適合直接部署到 GitHub Pages。

## 功能總覽

- 🏠 **首頁**：每日挑戰、三個每日任務（完成 5 題、閱讀 1 個教學、修正 1 題錯題）、整體學習進度、連續學習天數、XP、星星、徽章、等級稱號，以及各單元課程卡片。
- ✖️➗ **已可練習單元**：「分數的乘法」「分數的除法」使用動態題目引擎，每單元至少 30 題以上，練習時每次隨機抽 10 題，涵蓋選擇題與輸入題，具備：
  - 難度分級：基礎（easy）、進階（medium）、挑戰（hard）
  - 智慧練習：依目前正確率自動選擇適合難度
  - 避免短時間重複出現同一題
  - 立即批改與正確/錯誤標示
  - 提示（Hint）與詳解（解析）
  - 答題進度條與即時正確率
  - 練習結束的結算畫面（答對題數、正確率、單元完成度）
- 📖 **教學模式**：所有單元卡片都有「先學習／教學模式」入口。分數乘法與分數除法提供概念、步驟、常見錯誤、例題解析、自我檢查；其他單元提供基礎介紹，避免只顯示敬請期待。
- 💾 **本機學習紀錄**：使用 `localStorage` 保存各單元作答次數、正確率、完成度、連續學習天數、錯題本、最近出題記錄、教學閱讀紀錄與獎勵資料。所有資料**只存在使用者瀏覽器**，不會上傳到任何伺服器。
- 👨‍👩‍👧 **家長進度檢視頁**（`parent.html`）：預設家長密碼為 `8888`，驗證通過後才能查看學習天數、最近學習日期、各單元作答狀況、完整錯題本（含解析）、XP、星星、稱號、徽章與每日任務狀態，以及使用具二次確認的「清除所有學習紀錄」功能。

## 專案結構

```
index.html          # 首頁
practice.html        # 練習頁（以 ?unit=<id> 參數決定單元）
lesson.html          # 教學模式頁
parent.html          # 家長進度檢視頁
css/styles.css        # 全站樣式（響應式、親子友善配色）
js/
  data.js             # 單元清單與題庫資料
  lessons.js          # 各單元教學內容
  question-engine.js  # 動態題目產生、隨機抽題、難度與智慧練習
  rewards.js          # XP、星星、徽章、每日任務與等級稱號
  logic.js            # 純函式邏輯（分數解析、批改、正確率、連續天數、進度、錯題本）
  storage.js          # localStorage 存取層（相容舊資料並保存獎勵/閱讀/題目紀錄）
  parent-auth.js       # 家長密碼設定與驗證邏輯（預設密碼集中管理）
  home.js             # 首頁互動邏輯
  practice.js          # 練習頁互動邏輯
  lesson.js            # 教學頁互動與閱讀紀錄
  parent.js            # 家長頁互動邏輯
tests/
  logic.test.js        # 針對 logic.js 的單元測試（Node 內建測試框架）
  storage.test.js       # 針對 storage.js 的單元測試（以記憶體版 localStorage 模擬）
  question-engine.test.js # 動態題庫、難度篩選、避免重複、智慧練習
  rewards.test.js      # 每日任務、XP、星星、教學閱讀獎勵
  lesson.test.js       # 確認所有單元都有教學內容
package.json          # 測試指令設定（無任何 npm 相依套件）
```

## 本機執行方式

本站為純靜態網站，但由於使用了 ES Modules（`<script type="module">`），瀏覽器基於安全性限制，**不允許直接以 `file://` 方式開啟 index.html**，需要透過本機伺服器：

**方式一：使用 Python（大多數環境已內建）**

```powershell
cd 專案資料夾
python -m http.server 8080
```

然後開啟瀏覽器造訪 <http://localhost:8080/>

**方式二：使用 Node.js**

```powershell
npx serve .
```

**方式三：使用 VS Code 的 Live Server 擴充套件**

在 `index.html` 上按右鍵選擇「Open with Live Server」。

## 執行測試 / Build 驗證

專案不需要任何建置流程（沒有打包器、沒有 npm 相依套件），但提供了 Node.js 內建測試框架（`node --test`）驗證核心邏輯（分數解析、批改、正確率、連續學習天數、單元進度、錯題本合併與 localStorage 紀錄）：

```powershell
npm test
# 或直接：
node --test tests/
```

目前測試涵蓋分數判定、localStorage 相容、題目隨機/難度篩選、獎勵進度與教學閱讀紀錄。

## 部署到 GitHub Pages

1. 將本專案推送到 GitHub repository（例如 `linyufu0519/YUE-Learning`）。
2. 到 GitHub repository 的 **Settings → Pages**。
3. 在 **Build and deployment** 選擇 **Source: Deploy from a branch**。
4. **Branch** 選擇要發佈的分支（例如 `main`）與資料夾 `/ (root)`，儲存。
5. 等待數分鐘後，即可透過 `https://<使用者名稱>.github.io/<repo名稱>/` 造訪網站。

### 部署注意事項

- 本站所有連結皆使用**相對路徑**（例如 `css/styles.css`、`js/data.js`、`practice.html?unit=...`），無論部署在 repo 根目錄或子路徑下皆可正常運作，不需額外設定 `base` 路徑。
- 若要發佈非 `main` 分支的內容，請先建立 Pull Request 合併到指定的發佈分支，或直接調整 GitHub Pages 設定中選擇的分支。
- 學習紀錄與錯題本儲存在使用者「當次瀏覽器」的 `localStorage`：
  - 換裝置、換瀏覽器或清除瀏覽器資料都會導致紀錄消失（目前為 MVP，無雲端同步）。
  - 若之後要提供跨裝置同步，需要導入後端或雲端儲存服務。
  - 舊版紀錄會自動補上第二階段新增的 `rewards`、教學閱讀與最近出題欄位，不需要手動清除資料。
- GitHub Pages 為純靜態託管，不需要任何伺服器端設定或環境變數。
- 家長專區預設密碼集中定義於 `js/parent-auth.js` 的 `DEFAULT_PARENT_PASSWORD`，預設值為 `8888`。這是離線純前端的防誤入機制，密碼可從網站原始碼查到，不能取代後端身分驗證；若需要真正的存取控制，必須導入後端驗證。

## 後續可擴充方向

- 依相同的 `question-engine.js` 架構，陸續補上其他單元（比與比值、圓的周長與面積等）的動態題庫。
- 增加「錯題重練」專用模式（直接把錯題本題目重新組成一份練習）。
- 增加語音朗讀題目、圖形化解題步驟等無障礙／低年級友善功能。
- 若需要多位小孩或跨裝置同步，可將 `storage.js` 的介面抽換為雲端 API（目前的資料結構已經是單一 JSON 物件，便於未來搬遷）。
