// js/logic.js
// 純函式邏輯層：不依賴 DOM 或 localStorage，方便在瀏覽器與 Node 測試中共用。

/**
 * 解析分數字串，支援 "3/4"、"-3/4"、整數 "5"、帶分數 "1又2/3" 或 "1 2/3"。
 * @param {string} input
 * @returns {{num:number, den:number}|null}
 */
export function parseFraction(input) {
  if (typeof input !== "string") return null;
  const str = input.trim().replace(/\s+/g, " ");
  if (str === "") return null;

  // 帶分數："1又2/3" 或 "1 2/3"
  const mixedMatch = str.match(/^(-?\d+)(?:又| )(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1], 10);
    const num = parseInt(mixedMatch[2], 10);
    const den = parseInt(mixedMatch[3], 10);
    if (den === 0) return null;
    const sign = whole < 0 ? -1 : 1;
    return { num: sign * (Math.abs(whole) * den + num), den };
  }

  // 一般分數："3/4"
  const fracMatch = str.match(/^(-?\d+)\/(-?\d+)$/);
  if (fracMatch) {
    const num = parseInt(fracMatch[1], 10);
    const den = parseInt(fracMatch[2], 10);
    if (den === 0) return null;
    return { num, den };
  }

  // 純整數
  const intMatch = str.match(/^(-?\d+)$/);
  if (intMatch) {
    return { num: parseInt(intMatch[1], 10), den: 1 };
  }

  return null;
}

export function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

/** 將分數化為最簡分數（分母恆為正） */
export function simplifyFraction({ num, den }) {
  if (den < 0) {
    num = -num;
    den = -den;
  }
  const g = gcd(num, den);
  return { num: num / g, den: den / g };
}

/** 判斷兩分數是否數值相等（會自動化簡比較） */
export function fractionsEqual(a, b) {
  if (!a || !b) return false;
  const sa = simplifyFraction(a);
  const sb = simplifyFraction(b);
  return sa.num === sb.num && sa.den === sb.den;
}

export function parseDecimal(input) {
  if (typeof input !== "string") return null;
  const str = input.trim();
  if (!/^-?(?:\d+|\d*\.\d+)$/.test(str)) return null;
  const value = Number(str);
  return Number.isFinite(value) ? value : null;
}

export function decimalsEqual(a, b, epsilon = 0.000001) {
  if (a == null || b == null) return false;
  return Math.abs(a - b) < epsilon;
}

/**
 * 判斷使用者作答是否正確。
 * @param {{type:'choice'|'input', answer:string}} question
 * @param {string} userAnswer
 */
export function gradeAnswer(question, userAnswer) {
  if (userAnswer == null) return false;
  if (question.type === "choice") {
    return String(userAnswer).trim() === String(question.answer).trim();
  }
  // input 類型：先嘗試以分數數值比較，再嘗試小數數值比較，最後退回字串比較
  const parsedUser = parseFraction(String(userAnswer));
  const parsedAnswer = parseFraction(String(question.answer));
  if (parsedUser && parsedAnswer) {
    return fractionsEqual(parsedUser, parsedAnswer);
  }
  const decimalUser = parseDecimal(String(userAnswer));
  const decimalAnswer = parseDecimal(String(question.answer));
  if (decimalUser != null && decimalAnswer != null) {
    return decimalsEqual(decimalUser, decimalAnswer);
  }
  return String(userAnswer).trim() === String(question.answer).trim();
}

/** 計算正確率百分比（0-100，四捨五入到整數） */
export function calcAccuracy(correct, total) {
  if (!total || total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

/**
 * 根據上次學習日期與今天日期更新連續學習天數。
 * @param {string|null} lastDate 格式 YYYY-MM-DD，或 null 表示從未學習
 * @param {string} today 格式 YYYY-MM-DD
 * @returns {number} 更新後的連續天數
 */
export function updateStreak(lastDate, today, previousStreak = 0) {
  if (!lastDate) return 1;
  if (lastDate === today) return previousStreak || 1;

  const last = new Date(lastDate + "T00:00:00");
  const cur = new Date(today + "T00:00:00");
  const diffDays = Math.round((cur - last) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return (previousStreak || 0) + 1;
  return 1; // 中斷超過一天，重新計算
}

/** 依單元已完成題數與題庫總題數計算單元進度百分比 */
export function computeUnitProgress(completedCount, totalCount) {
  if (!totalCount || totalCount <= 0) return 0;
  return Math.min(100, Math.round((completedCount / totalCount) * 100));
}

/** 將今天的作答結果併入錯題本（相同 questionId 只保留最新一筆） */
export function mergeWrongBook(wrongBook, entry) {
  const list = Array.isArray(wrongBook) ? wrongBook.slice() : [];
  const idx = list.findIndex(
    (w) => w.unitId === entry.unitId && w.questionId === entry.questionId
  );
  if (entry.isCorrect) {
    // 答對了就從錯題本移除
    if (idx >= 0) list.splice(idx, 1);
    return list;
  }
  if (idx >= 0) {
    list[idx] = entry;
  } else {
    list.push(entry);
  }
  return list;
}

/**
 * 判斷教學頁「自我檢查」清單是否全部勾選完成，可讓「我讀完了」按鈕啟用。
 * 若該單元沒有自我檢查項目（totalItems 為 0 或未定義），視為安全通過，避免卡住使用者。
 * @param {number} totalItems 自我檢查項目總數
 * @param {number} checkedCount 目前已勾選的項目數
 */
export function canCompleteSelfCheck(totalItems, checkedCount) {
  const total = Number.isFinite(totalItems) ? totalItems : 0;
  if (total <= 0) return true;
  const checked = Number.isFinite(checkedCount) ? checkedCount : 0;
  return checked >= total;
}

/** 依 YYYY-MM-DD 格式取得今天日期字串（可注入日期以便測試） */
export function todayString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
