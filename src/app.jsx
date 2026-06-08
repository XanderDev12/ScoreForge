import { useEffect, useMemo, useState } from "react";
import { Catalog } from "./components/catalog/catalog.jsx";
import { AppShell } from "./components/layout/app-shell.jsx";
import { ScoreViewer } from "./components/score-viewer/score-viewer.jsx";
import { Uploads } from "./components/uploads/uploads.jsx";
import scores from "./data/scores/scores.json";

const SAVED_SCORES_STORAGE_KEY = "scoreforge:saved-scores";

export function App() {
  const [activeTab, setActiveTab] = useState("catalog");
  const [searchQuery, setSearchQuery] = useState("");
  const [savedScores, setSavedScores] = useState(() => loadSavedScores());
  const [uploadedScores] = useState([]);
  const [selectedScore, setSelectedScore] = useState(null);

  useEffect(() => {
    localStorage.setItem(SAVED_SCORES_STORAGE_KEY, JSON.stringify(savedScores));
  }, [savedScores]);

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

  function handleTabChange(nextTab) {
    setActiveTab(nextTab);
    setSelectedScore(null);
  }

  function handleSelectScore(score) {
    setActiveTab("viewer");
    setSelectedScore(score);
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
      onTabChange={handleTabChange}
      savedScores={savedScores}
      uploadedScores={uploadedScores}
      selectedScore={selectedScore}
      onSelectScore={handleSelectScore}
    >
      {selectedScore ? (
        <ScoreViewer
          score={selectedScore}
          onBack={() => {
            setSelectedScore(null);
            setActiveTab("catalog");
          }}
        />
      ) : activeTab === "catalog" ? (
          <Catalog
            scores={visibleScores}
            totalScoreCount={scores.length}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            savedScoreIds={savedScoreIds}
            onToggleSavedScore={handleToggleSavedScore}
            onViewScore={handleSelectScore}
          />
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

    return Array.isArray(savedScores) ? savedScores : [];
  } catch {
    return [];
  }
}
