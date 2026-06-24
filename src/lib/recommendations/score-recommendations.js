import { getScoreDifficultyKey } from "../scores/score-difficulty.js";

export function getRecentlyViewedScores(scores, recentlyViewedScoreIds = [], limit = 4) {
  if (!Array.isArray(scores) || !Array.isArray(recentlyViewedScoreIds)) {
    return [];
  }

  const scoresById = new Map(scores.map((score) => [score.id, score]));

  return recentlyViewedScoreIds
    .map((scoreId) => scoresById.get(scoreId))
    .filter(Boolean)
    .slice(0, limit);
}

export function getRecommendedScores({ account, excludeScoreIds = [], limit = 6, scores }) {
  if (!Array.isArray(scores)) {
    return [];
  }

  const profile = account?.profile ?? {};
  const excludedIds = new Set(excludeScoreIds);
  const preferences = {
    instruments: normalizeList([
      profile.primaryInstrument,
      profile.instruments,
    ]),
    preferredGenres: normalizeList(profile.preferredGenres),
    skillLevel: normalizeText(profile.skillLevel),
  };

  return scores
    .filter((score) => !excludedIds.has(score.id))
    .map((score) => ({
      score,
      weight: getRecommendationWeight(score, preferences),
    }))
    .sort((first, second) => second.weight - first.weight)
    .map(({ score }) => score)
    .slice(0, limit);
}

function getRecommendationWeight(score, preferences) {
  const popularity = score.popularity ?? {};
  let weight =
    readNumber(popularity.views) * 0.0008 +
    readNumber(popularity.favorites) * 0.04 +
    readNumber(popularity.rating) * 120;

  if (matchesPreferredGenre(score, preferences.preferredGenres)) {
    weight += 600;
  }

  if (matchesInstrument(score, preferences.instruments)) {
    weight += 400;
  }

  if (matchesSkillLevel(score, preferences.skillLevel)) {
    weight += 250;
  }

  return weight;
}

function matchesPreferredGenre(score, preferredGenres) {
  if (preferredGenres.length === 0) {
    return false;
  }

  const genre = normalizeText(score.genre);

  return preferredGenres.some((preferredGenre) => genre.includes(preferredGenre));
}

function matchesInstrument(score, instruments) {
  if (instruments.length === 0) {
    return false;
  }

  const scoreInstruments = normalizeList([
    score.instrument,
    score.primaryInstrument,
    score.instrumentation,
    score.instruments,
    score.tracks,
  ]);

  return instruments.some((instrument) => scoreInstruments.includes(instrument));
}

function matchesSkillLevel(score, skillLevel) {
  return Boolean(skillLevel) && getScoreDifficultyKey(score) === skillLevel;
}

function normalizeList(values) {
  return asArray(values)
    .flatMap((value) => asArray(value))
    .filter(Boolean)
    .map((value) => normalizeText(value))
    .filter(Boolean);
}

function asArray(value) {
  return Array.isArray(value) ? value : [value];
}

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function readNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}
