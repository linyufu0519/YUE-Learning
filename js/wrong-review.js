// 錯題複習的純函式：沿用既有錯題資料，不改變 localStorage／Firebase 結構。

export function getWrongReviewKey(entry) {
  return `${entry.unitId}::${entry.questionId}`;
}

function normalizeChoiceData(entry, originalQuestion) {
  const source = originalQuestion || entry;
  const answer = String(entry.correctAnswer);
  const choices = Array.isArray(source.choices) ? source.choices.map(String) : [];
  if (source.type !== "choice" || choices.length < 2 || !choices.includes(answer)) {
    return { type: "input", choices: undefined };
  }
  return { type: "choice", choices };
}

export function createWrongReviewQuestions(
  wrongBook,
  selectedKey = null,
  resolveOriginalQuestion = () => null
) {
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
    .map((entry) => {
      const originalQuestion = resolveOriginalQuestion(entry);
      const choiceData = normalizeChoiceData(entry, originalQuestion);
      return {
        id: entry.questionId,
        unitId: entry.unitId,
        stageId: entry.stageId || originalQuestion?.stageId || null,
        difficulty: "review",
        selectedDifficulty: "review",
        type: choiceData.type,
        choices: choiceData.choices,
        prompt: entry.prompt,
        answer: String(entry.correctAnswer),
        hint:
          originalQuestion?.hint ||
          entry.hint ||
          "回想上次的解析，先把算式一步一步寫下來。",
        explanation: entry.explanation || "再檢查一次計算步驟與答案格式。",
      };
    });
}
