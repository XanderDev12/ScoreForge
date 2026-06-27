import { useEffect, useState } from "react";
import { useScorePlayback } from "./use-score-playback.js";

export function ScoreSampler({ musicXmlUrl, onPlaybackProgress, seekRequest }) {
  const [tempoPercent, setTempoPercent] = useState(100);
  const {
    duration,
    error,
    position,
    status,
    seekBy,
    seekToScoreTimestamp,
    timing,
    togglePlayback,
  } = useScorePlayback(musicXmlUrl, tempoPercent);
  const isPlaying = status === "playing";
  const isPreparing = status === "loading" || status === "starting";
  const isUnavailable = status === "unavailable" || status === "error";

  useEffect(() => {
    onPlaybackProgress?.({ duration, position, status, timing });
  }, [duration, onPlaybackProgress, position, status, timing]);

  useEffect(() => {
    if (seekRequest) {
      seekToScoreTimestamp(seekRequest.scoreTimestamp);
    }
  }, [seekRequest]);

  return (
    <section className="score-sampler" aria-label="Score playback">
      <div className="playback-actions">
        <button
          className="seek-sample-button"
          type="button"
          title="Back 5 seconds"
          aria-label="Back 5 seconds"
          disabled={isPreparing || isUnavailable}
          onClick={() => seekBy(-5)}
        >
          <span aria-hidden="true">-5</span>
        </button>
        <button
          className="play-sample-button"
          type="button"
          title={isPlaying ? "Pause" : "Play"}
          aria-label={getPlayButtonLabel(status)}
          disabled={isPreparing || isUnavailable}
          onClick={togglePlayback}
        >
          <span
            className={isPlaying ? "pause-sample-icon" : "play-sample-icon"}
            aria-hidden="true"
          />
        </button>
        <button
          className="seek-sample-button"
          type="button"
          title="Forward 5 seconds"
          aria-label="Forward 5 seconds"
          disabled={isPreparing || isUnavailable}
          onClick={() => seekBy(5)}
        >
          <span aria-hidden="true">+5</span>
        </button>
      </div>

      <p className="playback-status" aria-live="polite">
        {getStatusText({ duration, error, position, status })}
      </p>

      <label className="tempo-control">
        <span>Tempo</span>
        <strong>{tempoPercent}%</strong>
        <input
          type="range"
          min="25"
          max="400"
          value={tempoPercent}
          disabled={isUnavailable}
          onChange={(event) => setTempoPercent(Number(event.target.value))}
        />
      </label>
    </section>
  );
}

function getPlayButtonLabel(status) {
  if (status === "playing") {
    return "Pause";
  }

  if (status === "loading" || status === "starting") {
    return "Loading";
  }

  return "Play";
}

function getStatusText({ duration, error, position, status }) {
  if (status === "unavailable" || status === "error") {
    return error || "Audio unavailable for this score";
  }

  if (status === "loading") {
    return "Preparing MusicXML audio...";
  }

  if (status === "idle") {
    return "Ready to play";
  }

  if (status === "starting") {
    return "Starting audio...";
  }

  return `${formatTime(position)} / ${formatTime(duration)}`;
}

function formatTime(seconds) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = Math.floor(safeSeconds % 60);

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}
