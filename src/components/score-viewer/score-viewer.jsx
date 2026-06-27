import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { ScoreSampler } from "../sampler/score-sampler.jsx";
import { ScoreDownloadMenu } from "../scores/score-download-menu.jsx";
import { formatScoreDifficulty } from "../../lib/scores/score-difficulty.js";
import { fetchScoreSource } from "../../lib/scores/fetch-score-source.js";
import { sanitizeMusicXml } from "../../lib/scores/sanitize-musicxml.js";
import { getMusicDataUrl } from "../../lib/utils/music-data-url.js";
import { getClickedScoreTimestamp } from "./get-clicked-score-timestamp.js";
import { useScorePlaybackCursor } from "./use-score-playback-cursor.js";

const SCORE_RENDER_WIDTH = 730;

export function ScoreViewer({
  backLabel = "Back to catalog",
  isSaved = false,
  isSavePending = false,
  onBack,
  onDeleteScore,
  onToggleSavedScore,
  savedScoresError,
  score,
}) {
  const xmlUrl = getMusicDataUrl(score.paths?.xml);
  const osmdContainerRef = useRef(null);
  const seekRequestIdRef = useRef(0);
  const [osmdInstance, setOsmdInstance] = useState(null);
  const [playback, setPlayback] = useState({
    duration: 0,
    position: 0,
    status: "loading",
    timing: null,
  });
  const [renderState, setRenderState] = useState("loading");
  const [optionsWidth, setOptionsWidth] = useState(260);
  const [showFingerings, setShowFingerings] = useState(false);
  const [seekRequest, setSeekRequest] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState("");

  useScorePlaybackCursor(osmdInstance, playback);

  useEffect(() => {
    let isActive = true;
    let osmd;
    let stopDecoratingPages = () => {};
    const controller = new AbortController();

    async function renderScore() {
      if (!osmdContainerRef.current || !xmlUrl) {
        setRenderState("error");
        return;
      }

      setRenderState("loading");
      setOsmdInstance(null);
      osmdContainerRef.current.innerHTML = "";
      osmdContainerRef.current.style.width = `${SCORE_RENDER_WIDTH}px`;

      try {
        const { OpenSheetMusicDisplay } = await import("opensheetmusicdisplay");
        osmd = new OpenSheetMusicDisplay(osmdContainerRef.current, {
          autoResize: false,
          backend: "svg",
          cursorsOptions: [
            { alpha: 0.88, color: "#b27a2b", follow: false, type: 1 },
          ],
          drawComposer: true,
          drawCredits: false,
          drawSubtitle: true,
          drawTitle: true,
          drawingParameters: "compact",
          pageFormat: "A4_P",
          onXMLRead: sanitizeMusicXml,
        });
        const source = await fetchScoreSource(xmlUrl, {
          signal: controller.signal,
        });
        const sourceBlob = new Blob([source.data], {
          type: source.isCompressed
            ? "application/vnd.recordare.musicxml"
            : "application/xml",
        });

        await osmd.load(sourceBlob);

        if (!isActive) {
          return;
        }

        osmd.render();
        osmdContainerRef.current.style.width = "100%";
        stopDecoratingPages = decorateRenderedPages(osmdContainerRef.current);

        if (osmdContainerRef.current?.childElementCount) {
          setOsmdInstance(osmd);
          setRenderState("ready");
        } else {
          setRenderState("error");
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error("Unable to render score with OSMD", error);

        if (isActive) {
          osmdContainerRef.current.style.width = "100%";
          setRenderState("error");
        }
      }
    }

    renderScore();

    return () => {
      isActive = false;
      controller.abort();
      stopDecoratingPages();

      if (osmd) {
        osmd.AutoResizeEnabled = false;
        osmd.clear();
      }

      if (osmdContainerRef.current) {
        osmdContainerRef.current.style.width = "";
      }
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

  async function handleDeleteScore() {
    if (
      isDeleting
      || !window.confirm(`Permanently delete "${score.songName || "Untitled score"}"?`)
    ) {
      return;
    }

    setActionError("");
    setIsDeleting(true);

    try {
      await onDeleteScore(score);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to delete score.");
      setIsDeleting(false);
    }
  }

  function handleScoreClick(event) {
    if (!osmdInstance || !osmdContainerRef.current) {
      return;
    }

    const scoreTimestamp = getClickedScoreTimestamp({
      container: osmdContainerRef.current,
      event,
      osmd: osmdInstance,
    });

    if (scoreTimestamp === null) {
      return;
    }

    seekRequestIdRef.current += 1;
    setSeekRequest({
      id: seekRequestIdRef.current,
      scoreTimestamp,
    });
  }

  return (
    <main className="score-viewer-page app-view">
      <section className="score-viewer-header" aria-labelledby="score-viewer-title">
        <div>
          <button className="back-button" type="button" onClick={onBack}>
            {backLabel}
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
            <div>
              <dt>Difficulty</dt>
              <dd>{formatScoreDifficulty(score)}</dd>
            </div>
          </dl>
        </div>

        <div className="viewer-actions" aria-label="Score file actions">
          {onToggleSavedScore ? (
            <button
              className={isSaved ? "save-score viewer-save-button active" : "save-score viewer-save-button"}
              type="button"
              disabled={isSavePending}
              onClick={() => onToggleSavedScore(score)}
              aria-label={isSaved ? "Remove from saved scores" : "Save score"}
              aria-pressed={isSaved}
              title={isSaved ? "Remove from saved scores" : "Save score"}
            >
              <span aria-hidden="true" />
            </button>
          ) : null}
          {onDeleteScore ? (
            <button
              className="viewer-delete-button"
              type="button"
              disabled={isDeleting}
              onClick={handleDeleteScore}
              aria-label={isDeleting ? "Deleting score" : "Delete score"}
              title="Delete score"
            >
              <Trash2 aria-hidden="true" size={18} strokeWidth={2} />
            </button>
          ) : null}
          <ScoreDownloadMenu score={score} />
        </div>
        {savedScoresError || actionError ? (
          <p className="viewer-action-error" role="alert">
            {actionError || savedScoresError}
          </p>
        ) : null}
      </section>

      <div
        className="score-viewer-workspace"
        style={{ "--score-options-width": `${optionsWidth}px` }}
      >
        <section className="score-preview" aria-label="Score preview">
          {renderState === "loading" ? (
            <div className="score-preview-status">Loading interactive score...</div>
          ) : null}

          <div
            className={renderState === "ready" ? "osmd-container ready" : "osmd-container"}
            ref={osmdContainerRef}
            onClick={handleScoreClick}
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

          <ScoreSampler
            musicXmlUrl={xmlUrl}
            onPlaybackProgress={setPlayback}
            seekRequest={seekRequest}
          />

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

function decorateRenderedPages(container) {
  const pages = container?.querySelectorAll('[id^="osmdCanvasPage"]') ?? [];

  pages.forEach((page, index) => {
    page.classList.add("score-sheet-page");
    page.dataset.pageNumber = String(index + 1);
  });

  function resizePages() {
    const scale = Math.min(1, container.clientWidth / SCORE_RENDER_WIDTH);

    pages.forEach((page) => {
      page.style.zoom = String(scale);
    });
  }

  resizePages();

  const observer = new ResizeObserver(resizePages);
  observer.observe(container);

  return () => observer.disconnect();
}
