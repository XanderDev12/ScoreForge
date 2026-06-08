import { getMusicDataUrl } from "../../lib/utils/music-data-url.js";

export function ScoreViewer({ score, onBack }) {
  const pdfUrl = getMusicDataUrl(score.paths?.pdf);
  const xmlUrl = getMusicDataUrl(score.paths?.xml);
  const metadataUrl = getMusicDataUrl(score.paths?.metadata);

  return (
    <main className="score-viewer-page app-view">
      <section className="score-viewer-header" aria-labelledby="score-viewer-title">
        <div>
          <button className="back-button" type="button" onClick={onBack}>
            Back to catalog
          </button>
          <p className="catalog-kicker">Score Viewer</p>
          <h1 id="score-viewer-title">{score.songName || "Untitled score"}</h1>
          <p>{score.composer || "Unknown composer"}</p>
        </div>

        <div className="viewer-actions" aria-label="Score file actions">
          {pdfUrl ? (
            <a href={pdfUrl} download>
              PDF
            </a>
          ) : null}
          {xmlUrl ? (
            <a href={xmlUrl} download>
              MusicXML
            </a>
          ) : null}
          {metadataUrl ? (
            <a href={metadataUrl} download>
              Metadata
            </a>
          ) : null}
        </div>
      </section>

      <section className="score-preview" aria-label="Score preview">
        {pdfUrl ? (
          <iframe title={`${score.songName || "Score"} PDF preview`} src={pdfUrl} />
        ) : (
          <div className="score-preview-empty">
            <h2>No PDF preview available</h2>
            <p>This score does not currently have a PDF path to display.</p>
          </div>
        )}
      </section>
    </main>
  );
}
