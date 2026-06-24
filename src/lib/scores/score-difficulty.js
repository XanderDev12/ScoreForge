const DIFFICULTY_LABELS = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  expert: "Expert",
};

export function getScoreDifficultyKey(scoreOrComplexity) {
  const rawComplexity =
    typeof scoreOrComplexity === "object"
      ? scoreOrComplexity?.complexity ?? scoreOrComplexity?.difficulty
      : scoreOrComplexity;
  const complexity = Number(rawComplexity);

  if (!Number.isFinite(complexity)) {
    return "";
  }

  if (complexity <= 0) {
    return "beginner";
  }

  if (complexity <= 1) {
    return "intermediate";
  }

  if (complexity <= 2) {
    return "advanced";
  }

  return "expert";
}

export function formatScoreDifficulty(scoreOrComplexity) {
  const difficultyKey = getScoreDifficultyKey(scoreOrComplexity);

  return DIFFICULTY_LABELS[difficultyKey] ?? "Unknown";
}
