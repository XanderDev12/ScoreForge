import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { ScoreDownloadMenu } from "../scores/score-download-menu.jsx";

export function Uploads({
  forgeError,
  forgeStatus,
  isSignedIn,
  profileError,
  signedInEmail,
  onDeleteScore,
  onUploadScore,
  onViewScore,
  uploadedScores,
}) {
  const inputRef = useRef(null);
  const [error, setError] = useState("");
  const [deletingScoreId, setDeletingScoreId] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  async function handleFile(file) {
    if (!file || isUploading) {
      return;
    }

    setError("");
    setIsUploading(true);

    try {
      await onUploadScore(file);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload score.");
    } finally {
      setIsUploading(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    handleFile(event.dataTransfer.files[0]);
  }

  async function handleDelete(score) {
    if (
      deletingScoreId
      || !window.confirm(`Permanently delete "${score.songName || "Untitled score"}"?`)
    ) {
      return;
    }

    setError("");
    setDeletingScoreId(score.id);

    try {
      await onDeleteScore(score);
    } catch {
      // The app-level Forge error reports remote deletion failures.
    } finally {
      setDeletingScoreId("");
    }
  }

  return (
    <main className="uploads-page app-view">
      <section className="uploads-hero" aria-labelledby="uploads-title">
        <div>
          <p className="catalog-kicker">ScoreForge Forge</p>
          <h1 id="uploads-title">Forge workspace</h1>
        </div>
        <p className="catalog-summary">
          {uploadedScores.length.toLocaleString()} forged scores
        </p>
      </section>

      <section className="forge-upload-section" aria-labelledby="forge-upload-title">
        <div
          className="forge-upload-dropzone"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <div>
            <p className="catalog-kicker">Import a score</p>
            <h2 id="forge-upload-title">Open MusicXML in Forge</h2>
            <p>Choose a `.musicxml`, `.xml`, or compressed `.mxl` score up to 12 MB.</p>
            <p className="forge-upload-note">
              {isSignedIn
                ? `Signed in as ${signedInEmail}. Uploads save to Supabase.`
                : "You are signed out. Uploads open temporarily and will not save to Supabase."}
            </p>
          </div>

          <button
            type="button"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? "Opening..." : "Choose Score"}
          </button>
          <input
            ref={inputRef}
            className="visually-hidden"
            type="file"
            accept=".musicxml,.xml,.mxl,application/vnd.recordare.musicxml+xml,application/vnd.recordare.musicxml,application/xml,text/xml"
            onChange={(event) => handleFile(event.target.files[0])}
          />
        </div>

        {error ? <p className="forge-upload-error" role="alert">{error}</p> : null}
        {profileError ? <p className="forge-upload-error" role="alert">{profileError}</p> : null}
        {forgeError ? <p className="forge-upload-error" role="alert">{forgeError}</p> : null}
        {forgeStatus ? <p className="forge-upload-status" role="status">{forgeStatus}</p> : null}

        {uploadedScores.length > 0 ? (
          <div className="forge-score-list" aria-label="Uploaded scores">
            {uploadedScores.map((score) => (
              <article className="forge-score-row" key={score.id}>
                <div className="forge-score-details">
                  <h3>{score.songName}</h3>
                  <p>{score.composer}</p>
                </div>
                <div className="forge-score-actions">
                  <ScoreDownloadMenu score={score} />
                  <button
                    type="button"
                    disabled={Boolean(deletingScoreId)}
                    onClick={() => onViewScore(score)}
                  >
                    View
                  </button>
                  <button
                    className="danger-button"
                    type="button"
                    disabled={Boolean(deletingScoreId)}
                    onClick={() => handleDelete(score)}
                    aria-label={
                      deletingScoreId === score.id
                        ? `Deleting ${score.songName || "score"}`
                        : `Delete ${score.songName || "score"}`
                    }
                    title={`Delete ${score.songName || "score"}`}
                  >
                    <Trash2 aria-hidden="true" size={18} strokeWidth={2} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
