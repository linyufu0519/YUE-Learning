// js/version-ui.js
// 教材版本切換共用元件：首頁與家長頁都需要「康軒版／翰林版」切換按鈕。
// 切換後呼叫 setCurrentVersion 保存偏好（含觸發雲端同步通知），並重新整理頁面，
// 讓單元卡片、今日任務、教學/練習入口、家長單元列表都依新版本重新渲染。
import { VERSIONS } from "./curriculum.js";
import { getCurrentVersion, setCurrentVersion } from "./storage.js";

export function renderVersionSwitcher(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const current = getCurrentVersion();

  container.innerHTML = VERSIONS.map(
    (v) => `
      <button
        type="button"
        class="version-btn${v.id === current ? " active" : ""}"
        data-version="${v.id}"
        aria-pressed="${v.id === current}"
      >${v.label}</button>
    `
  ).join("");

  container.querySelectorAll(".version-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.version === current) return;
      setCurrentVersion(btn.dataset.version);
      window.location.reload();
    });
  });
}
