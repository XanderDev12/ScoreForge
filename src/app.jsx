import { useMemo, useState } from "react";
import { Catalog } from "./components/catalog/catalog.jsx";
import { AppShell } from "./components/layout/app-shell.jsx";
import { Uploads } from "./components/uploads/uploads.jsx";
import scores from "./data/scores/scores.json";

export function App() {
  const [activeTab, setActiveTab] = useState("catalog");
  const [searchQuery, setSearchQuery] = useState("");
  const [savedScores, setSavedScores] = useState([]);
  const [uploadedScores] = useState([]);

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
      onTabChange={setActiveTab}
      savedScores={savedScores}
      uploadedScores={uploadedScores}
    >
      {activeTab === "catalog" ? (
        <Catalog
          scores={visibleScores}
          totalScoreCount={scores.length}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          savedScoreIds={savedScoreIds}
          onToggleSavedScore={handleToggleSavedScore}
        />
      ) : (
        <Uploads uploadedScores={uploadedScores} />
      )}
    </AppShell>
  );
}
