// js/curriculum.js
// 教材版本抽象層：統一提供「依目前教材版本取得單元清單／單元詳情／教學內容／練習題庫」的介面，
// 讓 home.js / practice.js / lesson.js / parent.js 不需要各自判斷版本邏輯。
import { UNITS as HANLIN_UNITS, getUnitById as getHanlinUnitById } from "./data.js";
import { KANGXUAN_UNITS, getKangxuanUnitById } from "./data-kangxuan.js";
import { LESSONS, getLesson as getHanlinLesson } from "./lessons.js";
import { getKangxuanLesson } from "./lessons-kangxuan.js";
import { getQuestionBank as getEngineQuestionBank, getAvailableQuestionCount as getEngineQuestionCount } from "./question-engine.js";

export const VERSIONS = [
  { id: "kangxuan", label: "康軒版" },
  { id: "hanlin", label: "翰林版" },
];

export const DEFAULT_VERSION = "kangxuan";
export const VERSION_IDS = VERSIONS.map((v) => v.id);

export function isValidVersion(version) {
  return VERSION_IDS.includes(version);
}

export function getVersionLabel(version) {
  const found = VERSIONS.find((v) => v.id === version);
  return found ? found.label : version;
}

export function getUnitsForVersion(version) {
  return version === "hanlin" ? HANLIN_UNITS : KANGXUAN_UNITS;
}

export function getUnitByVersion(version, unitId) {
  return version === "hanlin" ? getHanlinUnitById(unitId) : getKangxuanUnitById(unitId);
}

/**
 * 取得單元用來抽題的題庫 key。
 * 翰林版單元直接使用自己的 unitId；康軒版若設定了 practiceBankKey（例如第2單元分數除法）
 * 則沿用該題庫，其餘尚未有完整題庫的單元回傳 null。
 */
export function getPracticeBankKey(version, unitId) {
  if (version === "hanlin") return unitId;
  const unit = getKangxuanUnitById(unitId);
  return (unit && unit.practiceBankKey) || null;
}

export function isPracticeAvailable(version, unitId) {
  const unit = getUnitByVersion(version, unitId);
  return Boolean(unit && unit.available && getPracticeBankKey(version, unitId));
}

export function getAvailableQuestionCount(version, unitId) {
  const bankKey = getPracticeBankKey(version, unitId);
  return bankKey ? getEngineQuestionCount(bankKey) : 0;
}

export function getQuestionBank(version, unitId) {
  const bankKey = getPracticeBankKey(version, unitId);
  return bankKey ? getEngineQuestionBank(bankKey) : [];
}

/**
 * 取得單元教學內容。翰林版直接查 js/lessons.js；
 * 康軒版第2單元沿用翰林版「分數的除法」教學內容，其餘單元使用康軒版基礎導覽教學。
 */
export function getLessonForVersion(version, unitId) {
  if (version === "hanlin") return getHanlinLesson(unitId);
  const unit = getKangxuanUnitById(unitId);
  if (unit && unit.reuseLessonKey) return LESSONS[unit.reuseLessonKey];
  return getKangxuanLesson(unitId);
}

/**
 * 依 unitId 反查所屬教材版本與單元資料。
 * 由於康軒版單元 id 一律加上 "kx-" 前綴，與翰林版 id 不會重複，
 * 因此 practice.html / lesson.html 只需帶 unit id，不需額外帶 version 參數即可正確解析所屬版本。
 * 若找不到對應單元，version 會回傳 fallbackVersion（預設為目前使用者選擇的版本）。
 */
export function resolveUnit(unitId, fallbackVersion = DEFAULT_VERSION) {
  for (const version of VERSION_IDS) {
    const unit = getUnitByVersion(version, unitId);
    if (unit) return { version, unit };
  }
  return { version: fallbackVersion, unit: null };
}
