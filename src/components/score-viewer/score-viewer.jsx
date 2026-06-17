import { useEffect, useRef, useState } from "react";
import { getMusicDataUrl } from "../../lib/utils/music-data-url.js";

export function ScoreViewer({ score, onBack }) {
  const pdfUrl = getMusicDataUrl(score.paths?.pdf);
  const xmlUrl = getMusicDataUrl(score.paths?.xml);
  const metadataUrl = getMusicDataUrl(score.paths?.metadata);
  const osmdContainerRef = useRef(null);
  const [renderState, setRenderState] = useState("loading");
  const [tempo, setTempo] = useState(100);
  const [optionsWidth, setOptionsWidth] = useState(260);
  const [showFingerings, setShowFingerings] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function renderScore() {
      if (!osmdContainerRef.current || !xmlUrl) {
        setRenderState("error");
        return;
      }

      setRenderState("loading");
      osmdContainerRef.current.innerHTML = "";

      try {
        const { OpenSheetMusicDisplay } = await import("opensheetmusicdisplay");
        const osmd = new OpenSheetMusicDisplay(osmdContainerRef.current, {
          autoResize: true,
          backend: "svg",
          drawTitle: false,
          drawingParameters: "compact",
        });

        await osmd.load(xmlUrl);

        if (!isActive) {
          return;
        }

        osmd.render();

        if (osmdContainerRef.current?.childElementCount) {
          setRenderState("ready");
        } else {
          setRenderState("error");
        }
      } catch (error) {
        console.error("Unable to render score with OSMD", error);

        if (isActive) {
          setRenderState("error");
        }
      }
    }

    renderScore();

    return () => {
      isActive = false;
    };
  }, [xmlUrl]);

  function handleOptionsResizeStart(event) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const resizeHandle = event.currentTarget;
    const startX = event.clientX;
    const startWidth = optionsWidth;

    function handlePointerMove(moveEvent) {
      const nextWidth = startWidth - (moveEvent.clientX - startX);
      setOptionsWidth(clampOptionsWidth(nextWidth));
    }

    function handlePointerUp(upEvent) {
      if (resizeHandle.hasPointerCapture(upEvent.pointerId)) {
        resizeHandle.releasePointerCapture(upEvent.pointerId);
      }

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  }

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
          <dl className="score-viewer-details">
            <div>
              <dt>Genre</dt>
              <dd>{score.genre || "Unknown"}</dd>
            </div>
            <div>
              <dt>Views</dt>
              <dd>{formatCount(score.popularity?.views)}</dd>
            </div>
            <div>
              <dt>Rating</dt>
              <dd>{formatRating(score.popularity?.rating)}</dd>
            </div>
          </dl>
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

      <div
        className="score-viewer-workspace"
        style={{ "--score-options-width": `${optionsWidth}px` }}
      >
        <section className="score-preview" aria-label="Score preview">
          <div className="score-title-page">
            <h2>{score.songName || "Untitled score"}</h2>
            <p>{score.composer || "Unknown composer"}</p>
          </div>

          {renderState === "loading" ? (
            <div className="score-preview-status">Loading interactive score...</div>
          ) : null}

          <div
            className={renderState === "ready" ? "osmd-container ready" : "osmd-container"}
            ref={osmdContainerRef}
          />

          {renderState === "error" ? (
            <div className="score-preview-empty">
              <h2>Interactive score unavailable</h2>
              <p>
                This score could not be rendered from MusicXML yet. You can still
                download the source files above.
              </p>
            </div>
          ) : null}
        </section>

        <aside className="score-options-panel" aria-label="Score options">
          <button
            className="score-options-resize-handle"
            type="button"
            onPointerDown={handleOptionsResizeStart}
            aria-label="Resize score options panel"
          />

          <div className="score-options-header">
            <p>Options</p>
            <span>Preview tools</span>
          </div>

          <button className="play-sample-button" type="button">
            Play
          </button>

          <label className="tempo-control">
            <span>Tempo</span>
            <strong>{tempo}%</strong>
            <input
              type="range"
              min="25"
              max="400"
              value={tempo}
              onChange={(event) => setTempo(Number(event.target.value))}
            />
          </label>

          <label className="viewer-toggle">
            <input
              type="checkbox"
              checked={showFingerings}
              onChange={(event) => setShowFingerings(event.target.checked)}
            />
            <span>Display fingerings</span>
          </label>

          <p className="viewer-options-note">
            Fingerings are a layout placeholder for upcoming score annotation
            features.
          </p>
        </aside>
      </div>
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
  return value > 0 ? `${value.toFixed(2)} / 5` : "N/A";
}

function clampOptionsWidth(width) {
  return Math.min(420, Math.max(220, width));
}
