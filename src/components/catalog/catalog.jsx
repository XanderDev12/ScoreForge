import { formatScoreDifficulty } from "../../lib/scores/score-difficulty.js";

export function Catalog({
  scores,
  totalScoreCount,
  savedScoreIds,
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

      <section className="score-list" aria-label="Popular scores">
        {scores.length > 0 ? (
          scores.map((score, index) => (
            <article className="score-row" key={score.id}>
              <span className="score-rank">{index + 1}</span>
              <button
                className={savedScoreIds.has(score.id) ? "save-score active" : "save-score"}
                type="button"
                onClick={() => onToggleSavedScore(score)}
                aria-label={
                  savedScoreIds.has(score.id)
                    ? `Remove ${score.songName || "score"} from saved scores`
                    : `Save ${score.songName || "score"}`
                }
                aria-pressed={savedScoreIds.has(score.id)}
              >
                <span aria-hidden="true" />
              </button>
              <div className="score-copy">
                <h2>{score.songName || "Untitled score"}</h2>
                <p>{score.composer || "Unknown composer"}</p>
              </div>
              <dl className="score-popularity" aria-label="Popularity">
                <div>
                  <dt>Views</dt>
                  <dd>{formatCount(score.popularity?.views)}</dd>
                </div>
                <div>
                  <dt>Favorites</dt>
                  <dd>{formatCount(score.popularity?.favorites)}</dd>
                </div>
                <div>
                  <dt>Rating</dt>
                  <dd>
                    <RatingValue value={score.popularity?.rating} />
                  </dd>
                </div>
                <div>
                  <dt>Difficulty</dt>
                  <dd>{formatScoreDifficulty(score)}</dd>
                </div>
              </dl>
              <button
                className="score-view-button"
                type="button"
                onClick={() => onViewScore(score)}
              >
                View
              </button>
            </article>
          ))
        ) : (
          <p className="catalog-empty">No catalog scores match your search.</p>
        )}
      </section>
    </main>
  );
}

function formatCount(value = 0) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatRating(value = 0) {
  return value > 0 ? value.toFixed(2) : "N/A";
}

function RatingValue({ value = 0 }) {
  if (value <= 0) {
    return "N/A";
  }

  return (
    <span className="rating-value">
      <span>{formatRating(value)}</span>
      <span
        className="rating-star"
        style={{ "--rating-fill": `${Math.min(value / 5, 1) * 100}%` }}
        aria-hidden="true"
      >
        ★
      </span>
    </span>
  );
}
