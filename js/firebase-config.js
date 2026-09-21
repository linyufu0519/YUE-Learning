// js/firebase-config.js
// ------------------------------------------------------------------
// 本機開發用的「未設定」佔位檔（本檔已列入 .gitignore，不會被 commit）。
// 內容維持 js/firebase-config.example.js 的預設佔位字串，
// 因此 isFirebaseConfigured() 會判定為「尚未設定」，整站會自動以離線模式運作。
// 若要啟用雲端同步，請依照 FIREBASE_SETUP.md 的步驟填入真正的設定值。
// ------------------------------------------------------------------
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyAnhFOHjXMKYpizfGsrwCE5ebLx0iXRk2Y",
  authDomain: "yue-learning.firebaseapp.com",
  projectId: "yue-learning",
  storageBucket: "yue-learning.firebasestorage.app",
  messagingSenderId: "1077519405632",
  appId: "1:1077519405632:web:86898666360f5032a6c5a5",
  measurementId: "G-G1RT1W91LL"
};
