// js/parent-auth.js
// 純前端防誤入機制；如需變更預設家長密碼，只需修改此常數。
export const DEFAULT_PARENT_PASSWORD = "8888";

export function verifyParentPassword(input) {
  return typeof input === "string" && input.trim() === DEFAULT_PARENT_PASSWORD;
}
