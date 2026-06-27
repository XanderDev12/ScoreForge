import { ScoreCard } from "../scores/score-card.jsx";

export function Home({
  onOpenCatalog,
  onViewScore,
  recommendedScores,
}) {
  return (
    <main className="home-page app-view">
      <section className="home-hero" aria-labelledby="home-title">
        <div>
          <p className="catalog-kicker">ScoreForge</p>
          <h1 id="home-title">Shape public domain scores into something playable.</h1>
          <p>
            Browse the library, prepare uploads in the Forge, and build toward
            practice tools that keep the music close at hand.
          </p>
        </div>

        <button className="home-primary-action" type="button" onClick={onOpenCatalog}>
          Browse catalog
        </button>
      </section>

      <HomeScoreSection
        emptyText="Popular scores will appear here as the catalog grows."
        heading="Popular scores"
        onViewScore={onViewScore}
        scores={recommendedScores}
      />
    </main>
  );
}

function HomeScoreSection({ emptyText, heading, onViewScore, scores }) {
  return (
    <section className="home-score-section" aria-labelledby={`home-${toId(heading)}`}>
      <div className="home-section-header">
        <h2 id={`home-${toId(heading)}`}>{heading}</h2>
        <span>{scores.length}</span>
      </div>

      {scores.length > 0 ? (
        <div className="score-card-grid">
          {scores.map((score) => (
            <ScoreCard
              key={score.id}
              onViewScore={onViewScore}
              score={score}
            />
          ))}
        </div>
      ) : (
        <p className="home-score-empty">{emptyText}</p>
      )}
    </section>
  );
}

function toId(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
