import { formatScoreDifficulty } from "../../lib/scores/score-difficulty.js";

export function Home({
  account,
  onOpenCatalog,
  onViewScore,
  recentlyViewedScores,
  recommendedScores,
}) {
  const isSignedIn = account?.isSignedIn === true;
  const displayName = account?.displayName || "there";
  const primaryInstrument = account?.profile?.primaryInstrument;
  const skillLevel = account?.profile?.skillLevel;

  return (
    <main className="home-page app-view">
      <section className="home-hero" aria-labelledby="home-title">
        <div>
          <p className="catalog-kicker">ScoreForge</p>
          <h1 id="home-title">
            {isSignedIn
              ? `Welcome back, ${displayName}.`
              : "Shape public domain scores into something playable."}
          </h1>
          <p>
            {isSignedIn
              ? getSignedInSummary({ primaryInstrument, skillLevel })
              : "Browse the library, prepare uploads in the Forge, and build toward practice tools that keep the music close at hand."}
          </p>
        </div>

        <button className="home-primary-action" type="button" onClick={onOpenCatalog}>
          Browse catalog
        </button>
      </section>

      <HomeScoreSection
        emptyText="Popular scores will appear here as the catalog grows."
        heading={isSignedIn ? "Recommended for you" : "Popular scores"}
        onViewScore={onViewScore}
        scores={recommendedScores}
      />

      {isSignedIn ? (
        <HomeScoreSection
          emptyText="Scores you open will appear here."
          heading="Recently viewed"
          onViewScore={onViewScore}
          scores={recentlyViewedScores}
        />
      ) : null}
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
        <div className="home-score-grid">
          {scores.map((score) => (
            <article className="home-score-card" key={score.id}>
              <div>
                <p>{score.genre || "Sheet music"}</p>
                <h3>{score.songName || "Untitled score"}</h3>
                <span>{score.composer || "Unknown composer"}</span>
              </div>
              <div className="home-score-card-footer">
                <small>
                  {formatScoreDifficulty(score)} · {formatViews(score.popularity?.views)} views
                </small>
                <button type="button" onClick={() => onViewScore(score)}>
                  View
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="home-score-empty">{emptyText}</p>
      )}
    </section>
  );
}

function getSignedInSummary({ primaryInstrument, skillLevel }) {
  const profileParts = [skillLevel, primaryInstrument].filter(Boolean);

  if (profileParts.length === 0) {
    return "Your saved scores, recent activity, and recommendations will live here.";
  }

  return `Your ${profileParts.join(" ")} workspace is ready for recent scores and recommendations.`;
}

function formatViews(value = 0) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function toId(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
