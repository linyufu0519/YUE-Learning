// 錯題複習的純函式：沿用既有錯題資料，不改變 localStorage／Firebase 結構。

export function getWrongReviewKey(entry) {
  return `${entry.unitId}::${entry.questionId}`;
}

export function createWrongReviewQuestions(wrongBook, selectedKey = null) {
  const entries = Array.isArray(wrongBook) ? wrongBook : [];
  return entries
    .filter((entry) => !selectedKey || getWrongReviewKey(entry) === selectedKey)
    .filter(
      (entry) =>
        entry &&
        entry.unitId &&
        entry.questionId &&
        entry.prompt &&
        entry.correctAnswer != null
    )
    .map((entry) => ({
      id: entry.questionId,
      unitId: entry.unitId,
      difficulty: "review",
      selectedDifficulty: "review",
      type: "input",
      prompt: entry.prompt,
      answer: String(entry.correctAnswer),
      hint: "回想上次的解析，先把算式一步一步寫下來。",
      explanation: entry.explanation || "再檢查一次計算步驟與答案格式。",
    }));
}
