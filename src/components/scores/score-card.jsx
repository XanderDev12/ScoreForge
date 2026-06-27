import { formatScoreDifficulty } from "../../lib/scores/score-difficulty.js";
import { ScoreDownloadMenu } from "./score-download-menu.jsx";

export function ScoreCard({
  isSaved = false,
  isSavePending = false,
  onToggleSavedScore,
  onViewScore,
  score,
  showCatalogDetails = false,
}) {
  const scoreName = score.songName || "Untitled score";

  return (
    <article className="score-card">
      <button
        className="score-card-open-overlay"
        type="button"
        onClick={() => onViewScore(score)}
        aria-label={`Open ${scoreName} in score viewer`}
      />

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
            {showCatalogDetails ? (
              <small className="score-card-difficulty">
                {formatScoreDifficulty(score)}
              </small>
            ) : null}
          </div>
        </div>
      </div>

      <div
        className={
          showCatalogDetails
            ? "score-card-footer actions-only"
            : "score-card-footer"
        }
      >
        {showCatalogDetails ? null : (
          <small>
            {formatScoreDifficulty(score)} · {formatCount(score.popularity?.views)} views
          </small>
        )}
        <div className="score-card-actions">
          <ScoreDownloadMenu score={score} />
          {onToggleSavedScore ? (
            <button
              className={isSaved ? "save-score active" : "save-score"}
              disabled={isSavePending}
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
        </div>
      </div>
    </article>
  );
}

function formatCount(value = 0) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
