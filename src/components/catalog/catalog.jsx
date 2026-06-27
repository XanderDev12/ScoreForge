import { ScoreCard } from "../scores/score-card.jsx";

export function Catalog({
  scores,
  totalScoreCount,
  savedScoreIds,
  pendingSavedScoreIds,
  savedScoresError,
  onToggleSavedScore,
  onViewScore,
}) {
  return (
    <main className="catalog-page app-view">
      <section className="catalog-hero" aria-labelledby="catalog-title">
        <div>
          <p className="catalog-kicker">ScoreForge Catalog</p>
          <h1 id="catalog-title">Public domain sheet music</h1>
        </div>
        <p className="catalog-summary">
          {scores.length.toLocaleString()} of {totalScoreCount.toLocaleString()} scores sorted by popularity
        </p>
      </section>

      {savedScoresError ? (
        <p className="catalog-save-error" role="alert">{savedScoresError}</p>
      ) : null}

      <section className="score-card-grid catalog-score-grid" aria-label="Popular scores">
        {scores.length > 0 ? (
          scores.map((score) => (
            <ScoreCard
              isSaved={savedScoreIds.has(score.id)}
              isSavePending={pendingSavedScoreIds.has(score.id)}
              key={score.id}
              onToggleSavedScore={onToggleSavedScore}
              onViewScore={onViewScore}
              score={score}
              showCatalogDetails
            />
          ))
        ) : (
          <p className="catalog-empty">No catalog scores match your search.</p>
        )}
      </section>
    </main>
  );
}
