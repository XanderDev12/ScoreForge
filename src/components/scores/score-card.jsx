import { formatScoreDifficulty } from "../../lib/scores/score-difficulty.js";

export function ScoreCard({
  isSaved = false,
  onToggleSavedScore,
  onViewScore,
  score,
  showCatalogDetails = false,
}) {
  const scoreName = score.songName || "Untitled score";

  return (
    <article className="score-card">
      <div className="score-card-content">
        {showCatalogDetails ? null : (
          <div className="score-card-eyebrow">
            <p>{score.genre || "Sheet music"}</p>
          </div>
        )}

        <div className="score-card-title-row">
          <div>
            <h3>{scoreName}</h3>
            <span>{score.composer || "Unknown composer"}</span>
          </div>
        </div>
      </div>

      <div className="score-card-footer">
        <small>
          {showCatalogDetails
            ? <CatalogDetails score={score} />
            : `${formatScoreDifficulty(score)} · ${formatCount(score.popularity?.views)} views`}
        </small>
        <div className="score-card-actions">
          {onToggleSavedScore ? (
            <button
              className={isSaved ? "save-score active" : "save-score"}
              type="button"
              onClick={() => onToggleSavedScore(score)}
              aria-label={
                isSaved
                  ? `Remove ${scoreName} from saved scores`
                  : `Save ${scoreName}`
              }
              aria-pressed={isSaved}
            >
              <span aria-hidden="true" />
            </button>
          ) : null}
          <button
            className="score-card-view-button"
            type="button"
            onClick={() => onViewScore(score)}
          >
            View
          </button>
        </div>
      </div>
    </article>
  );
}

function CatalogDetails({ score }) {
  const rating = score.popularity?.rating ?? 0;

  return (
    <>
      {formatScoreDifficulty(score)} · {rating > 0 ? rating.toFixed(2) : "Not rated"}
      {rating > 0 ? (
        <span
          className="rating-star"
          style={{ "--rating-fill": `${Math.min(rating / 5, 1) * 100}%` }}
          aria-hidden="true"
        >
          ★
        </span>
      ) : null}
    </>
  );
}

function formatCount(value = 0) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
