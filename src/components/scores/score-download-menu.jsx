import { useEffect, useId, useState } from "react";
import { Download } from "lucide-react";
import { createPortal } from "react-dom";
import { getMusicDataUrl } from "../../lib/utils/music-data-url.js";

export function ScoreDownloadMenu({ score }) {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();
  const downloadOptions = getDownloadOptions(score);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (downloadOptions.length === 0) {
    return null;
  }

  return (
    <div className="score-download-menu">
      <button
        className="score-download-trigger"
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Download ${score.songName || "score"}`}
        title="Download score"
        onClick={() => setIsOpen(true)}
      >
        <Download aria-hidden="true" size={18} strokeWidth={2} />
      </button>

      {isOpen
        ? createPortal(
            <div
              className="auth-dialog-backdrop"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setIsOpen(false);
                }
              }}
            >
              <section
                className="auth-dialog score-download-dialog"
                aria-labelledby={titleId}
                aria-modal="true"
                role="dialog"
              >
                <div className="auth-dialog-header">
                  <div>
                    <p className="catalog-kicker">Download score</p>
                    <h2 id={titleId}>
                      Which file type would you like?
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close download options"
                  >
                    X
                  </button>
                </div>

                <p className="score-download-name">
                  {score.songName || "Untitled score"}
                </p>

                <div className="score-download-options" aria-label="Download formats">
                  {downloadOptions.map((option) => (
                    <a
                      download={option.fileName || true}
                      href={option.url}
                      key={option.id}
                      onClick={() => setIsOpen(false)}
                    >
                      <Download aria-hidden="true" size={17} strokeWidth={2} />
                      <span>{option.label}</span>
                    </a>
                  ))}
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function getDownloadOptions(score) {
  const paths = score.paths ?? {};

  return [
    createOption("pdf", "PDF", paths.pdf),
    createOption(
      "xml",
      "MusicXML",
      paths.xml,
      score.upload?.fileName,
    ),
    createOption("midi", "MIDI", paths.midi || paths.mid),
    createOption("metadata", "Metadata", paths.metadata),
  ].filter(Boolean);
}

function createOption(id, label, path, fileName = "") {
  const url = getMusicDataUrl(path);

  return url ? { fileName, id, label, url } : null;
}
