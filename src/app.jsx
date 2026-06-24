import { useEffect, useMemo, useState } from "react";
import { Catalog } from "./components/catalog/catalog.jsx";
import { Home } from "./components/home/home.jsx";
import { AppShell } from "./components/layout/app-shell.jsx";
import { Learn } from "./components/learn/learn.jsx";
import { ScoreViewer } from "./components/score-viewer/score-viewer.jsx";
import { Uploads } from "./components/uploads/uploads.jsx";
import mockAccount from "./data/accounts/mock-account.json";
import scores from "./data/scores/scores.json";
import {
  getRecentlyViewedScores,
  getRecommendedScores,
} from "./lib/recommendations/score-recommendations.js";

const SAVED_SCORES_STORAGE_KEY = "scoreforge:saved-scores";
const RECENT_SCORE_LIMIT = 12;

export function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [savedScores, setSavedScores] = useState(() => loadSavedScores());
  const [recentlyViewedScoreIds, setRecentlyViewedScoreIds] = useState(() => {
    return loadRecentlyViewedScoreIds(mockAccount);
  });
  const [uploadedScores] = useState([]);
  const [selectedScore, setSelectedScore] = useState(null);

  useEffect(() => {
    localStorage.setItem(SAVED_SCORES_STORAGE_KEY, JSON.stringify(savedScores));
  }, [savedScores]);

  useEffect(() => {
    localStorage.setItem(
      getRecentScoresStorageKey(mockAccount),
      JSON.stringify(recentlyViewedScoreIds),
    );
  }, [recentlyViewedScoreIds]);

  const visibleScores = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return scores;
    }

    return scores.filter((score) => {
      const songName = score.songName?.toLowerCase() ?? "";
      const composer = score.composer?.toLowerCase() ?? "";
      return songName.includes(normalizedQuery) || composer.includes(normalizedQuery);
    });
  }, [searchQuery]);

  const savedScoreIds = useMemo(() => {
    return new Set(savedScores.map((score) => score.id));
  }, [savedScores]);

  const recentlyViewedScores = useMemo(() => {
    return getRecentlyViewedScores(scores, recentlyViewedScoreIds);
  }, [recentlyViewedScoreIds]);

  const recommendedScores = useMemo(() => {
    return getRecommendedScores({
      account: mockAccount.isSignedIn ? mockAccount : null,
      excludeScoreIds: [
        ...recentlyViewedScoreIds,
        ...(mockAccount.recommendations?.excludedScoreIds ?? []),
      ],
      scores,
    });
  }, [recentlyViewedScoreIds]);

  function handleTabChange(nextTab) {
    setActiveTab(nextTab);
    setSelectedScore(null);
  }

  function handleHome() {
    setActiveTab("home");
    setSelectedScore(null);
  }

  function handleSearchSubmit() {
    setActiveTab("catalog");
    setSelectedScore(null);
  }

  function handleSelectScore(score) {
    setSelectedScore(score);
    setRecentlyViewedScoreIds((currentScoreIds) => {
      return [score.id, ...currentScoreIds.filter((scoreId) => scoreId !== score.id)]
        .slice(0, RECENT_SCORE_LIMIT);
    });
  }

  function handleToggleSavedScore(score) {
    setSavedScores((currentSavedScores) => {
      const isSaved = currentSavedScores.some((savedScore) => savedScore.id === score.id);

      if (isSaved) {
        return currentSavedScores.filter((savedScore) => savedScore.id !== score.id);
      }

      return [...currentSavedScores, score];
    });
  }

  return (
    <AppShell
      activeTab={activeTab}
      isHomeView={activeTab === "home" && !selectedScore}
      onTabChange={handleTabChange}
      onHome={handleHome}
      savedScores={savedScores}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      onSearchSubmit={handleSearchSubmit}
      uploadedScores={uploadedScores}
      onSelectScore={handleSelectScore}
    >
      {selectedScore ? (
        <ScoreViewer
          score={selectedScore}
          onBack={() => {
            setSelectedScore(null);
          }}
        />
      ) : activeTab === "catalog" ? (
        <Catalog
          scores={visibleScores}
          totalScoreCount={scores.length}
          savedScoreIds={savedScoreIds}
          onToggleSavedScore={handleToggleSavedScore}
          onViewScore={handleSelectScore}
        />
      ) : activeTab === "home" ? (
        <Home
          account={mockAccount}
          onViewScore={handleSelectScore}
          recentlyViewedScores={recentlyViewedScores}
          recommendedScores={recommendedScores}
          onOpenCatalog={() => handleTabChange("catalog")}
        />
      ) : activeTab === "learn" ? (
        <Learn />
      ) : (
        <Uploads uploadedScores={uploadedScores} />
      )}
    </AppShell>
  );
}

function loadSavedScores() {
  try {
    const savedScores = JSON.parse(
      localStorage.getItem(SAVED_SCORES_STORAGE_KEY) ?? "[]",
    );

    if (!Array.isArray(savedScores)) {
      return [];
    }

    const catalogScoresById = new Map(scores.map((score) => [score.id, score]));

    return savedScores
      .map((savedScore) => catalogScoresById.get(savedScore.id))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function loadRecentlyViewedScoreIds(account) {
  try {
    const storedScoreIds = JSON.parse(
      localStorage.getItem(getRecentScoresStorageKey(account)) ?? "null",
    );

    if (Array.isArray(storedScoreIds)) {
      return storedScoreIds.filter((scoreId) => typeof scoreId === "string");
    }
  } catch {
    // Fall back to the mock account's seeded history.
  }

  return account.library?.recentlyViewedScoreIds ?? [];
}

function getRecentScoresStorageKey(account) {
  return `scoreforge:${account.id}:recently-viewed-scores`;
}
