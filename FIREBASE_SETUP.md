# Firebase 雲端同步設定教學（繁體中文）

本站預設是**完全離線的靜態網站**：不設定任何東西也能正常使用，所有學習紀錄只存在瀏覽器
的 `localStorage`。如果想要「家裡電腦練習、學校/阿公家電腦也能看到同一份進度」，可以照
這份文件設定 Firebase，啟用「選用的」雲端同步。**沒有做這些設定，網站的其他功能完全不受影響。**

---

## 這套雲端同步的運作方式

- 使用 **Firebase Authentication（Email/Password）** 做帳號登入，親子共用同一組帳號即可。
- 使用 **Cloud Firestore** 儲存每位帳號的學習資料，路徑為 `users/{uid}/learning/state`。
- 前端透過 Firebase 官方 CDN 的 **Web modular SDK**（`https://www.gstatic.com/firebasejs/...`）
  以 ES module 動態載入，**不需要 npm 建置流程**，仍然可以直接部署到 GitHub Pages。
- 沒有設定 Firebase，或設定檔還是範本裡的佔位字串（`YOUR_API_KEY` 等），網站會自動偵測到
  「尚未設定」，安全地退回目前的 localStorage 離線模式，畫面上會顯示「離線模式，尚未設定雲端同步」，
  不會有任何錯誤訊息。

---

## 步驟一：建立 Firebase 專案

1. 開啟 [Firebase 主控台](https://console.firebase.google.com/)，登入 Google 帳號。
2. 點選「新增專案」，輸入專案名稱（例如 `yue-math-g6`），依畫面指示完成建立。
3. Google Analytics 可以選擇「不啟用」，本站用不到。

## 步驟二：新增 Web 應用程式，取得 firebaseConfig

1. 進入專案後，點選左上角齒輪圖示 →「專案設定」。
2. 在「一般」頁籤下方找到「你的應用程式」，點選 `</>`（網頁）圖示新增一個 Web App。
3. 輸入應用程式暱稱（例如 `yue-math-web`），**不需要**勾選「同時設定 Firebase Hosting」。
4. 建立完成後，畫面會顯示一組 `firebaseConfig`，長得像這樣：

   ```js
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "yue-math-g6.firebaseapp.com",
     projectId: "yue-math-g6",
     storageBucket: "yue-math-g6.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef1234567890",
   };
   ```

   請先複製保留，稍後會用到。

   > **安全性說明**：這組 `firebaseConfig`（尤其 `apiKey`）依 Firebase 官方文件設計上就是
   > 「公開的用戶端識別碼」，可以放心出現在前端程式碼中。真正保護資料的是下面步驟四的
   > **Firestore Security Rules** 與 **Authentication**，不是隱藏這組設定。
   > 但 **Service Account JSON、任何 private key，絕對不能**放進本專案的任何檔案或 commit
   > 到 Git，那些是完全不同的伺服器端機密。

## 步驟三：啟用 Email/Password 登入

1. 左側選單「Authentication」→「Sign-in method」（或「登入方式」）。
2. 選擇「Email/Password」，點選「啟用」，儲存。
3. 這一步之後，你就可以在網站上用同一組 Email/密碼「註冊」與「登入」。

## 步驟四：建立 Firestore Database 與 Security Rules

1. 左側選單「Firestore Database」→「建立資料庫」。
2. 選擇「以正式環境模式啟動」（Production mode），選一個離你近的地區（例如 `asia-east1`）。
3. 建立完成後，切到「規則」（Rules）頁籤，貼上以下規則並「發布」：

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```

   這個規則的意思是：**只有登入者本人（`request.auth.uid` 等於路徑中的 `uid`）才能讀寫
   自己的資料**，其他人（包含未登入者）完全無法讀取任何人的學習紀錄。

## 步驟五：填入本機的設定檔

1. 在專案的 `js/` 資料夾下，複製 `js/firebase-config.example.js`，另存新檔為
   `js/firebase-config.js`（這個檔名已經列在 `.gitignore`，不會被一般 `git add .` 誤加入）。
2. 打開 `js/firebase-config.js`，把步驟二取得的 `firebaseConfig` 內容貼進去，取代所有
   `YOUR_...` 佔位字串。
3. 本機用瀏覽器開啟 `index.html`（或用 `python -m http.server` 起本地伺服器），應該會看到
   「帳號與雲端同步」卡片的狀態文字從「離線模式，尚未設定雲端同步」變成
   「雲端同步已啟用，尚未登入」。

## 步驟六：部署到 GitHub Pages 並啟用雲端同步

GitHub Pages 是直接把 Git 分支內容當作靜態網站發布，因此 `js/firebase-config.js` 若被
`.gitignore` 排除，**不會出現在部署站台上**，雲端同步在正式站台上就不會啟用（仍會安全地
退回離線模式，不影響其他功能）。

如果你想讓「正式部署的 GitHub Pages 網站」也能使用雲端同步，有兩種做法：

### 做法 A（最簡單，適合這個專案規模）

在已經填好真實設定值的 `js/firebase-config.js`，用 `git add -f` 強制加入版本控制並 commit：

```bash
git add -f js/firebase-config.js
git commit -m "chore: 加入正式環境 Firebase 設定"
git push origin main
```

如同步驟二說明，`firebaseConfig` 本身設計上可公開，安全性由 Firestore Rules 與
Authentication 把關，因此這個做法是安全的。`.gitignore` 排除它只是為了避免多人開發、
多環境測試時，不小心把「暫時測試用/尚未填寫」的設定誤加入版本控制而已。

### 做法 B（進階，需要 CI/CD）

改用 GitHub Actions，在部署流程中從 GitHub Secrets 讀出設定值，於建置時動態產生
`js/firebase-config.js` 再發布到 `gh-pages` 分支。此做法可以完全不把設定值放進 Git 歷史，
但需要額外的 workflow 設定，超出本階段「純靜態、無建置」的範圍，之後有需要可以再擴充。

## 步驟七：註冊共用帳號並在兩台電腦驗證同步

1. 部署完成、確認雲端同步已啟用後，在**其中一台電腦**開啟網站首頁，於「帳號與雲端同步」
   卡片輸入家長打算共用的 Email 與密碼（至少 6 碼），點選「註冊（第一次使用）」。
2. 註冊成功後會自動登入，狀態文字會顯示「雲端同步完成（你的 Email）」。此時本機原本的
   `localStorage` 學習紀錄會自動上傳到 Firestore（不會覆蓋，採合併規則，詳見 README）。
3. 到**第二台電腦**（例如學校電腦、阿公家電腦），開啟同一個網址，用同一組 Email／密碼
   點選「登入」。登入後會自動抓取雲端資料，跟這台電腦原本的本機資料合併，兩邊都不會遺失。
4. 之後在任一台電腦練習、閱讀教學、獲得獎勵、家長清除紀錄，都會自動同步回 Firestore；
   下次在另一台電腦登入時就能看到最新進度。
5. 家長進度頁（`parent.html`）在通過 8888 密碼鎖之後，畫面上方也會顯示目前雲端同步狀態
   （離線 / 已登入哪個帳號）。

---

## 常見問題

**Q：忘記填 Firebase 設定會怎樣？**
A：完全不影響使用。網站會偵測到設定是佔位字串，自動以目前的 localStorage 離線模式運作，
帳號卡片會顯示「離線模式，尚未設定雲端同步」。

**Q：兩台電腦「同時」線上使用會不會互相蓋掉？**
A：本設計採「登入時合併、之後整份覆寫」的簡化策略，適合親子輪流使用（不同時間、不同裝置）
的情境。如果兩台裝置在極短時間內幾乎同時大量作答，才可能發生後寫入者覆蓋前者的極端情況；
一般家庭輪流使用不會遇到這個問題。

**Q：可以只登入不練習，只是想看看效果嗎？**
A：可以，登入後家長頁與首頁都會顯示目前是「已登入雲端同步」狀態，即使不特別操作也能確認
串接是否成功。
