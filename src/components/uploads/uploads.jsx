export function Uploads({ uploadedScores }) {
  return (
    <main className="uploads-page app-view">
      <section className="uploads-hero" aria-labelledby="uploads-title">
        <div>
          <p className="catalog-kicker">ScoreForge Uploads</p>
          <h1 id="uploads-title">Uploaded scores</h1>
        </div>
        <p className="catalog-summary">
          {uploadedScores.length.toLocaleString()} uploaded scores
        </p>
      </section>

      <section className="uploads-placeholder" aria-label="Uploads">
        <h2>Upload workspace</h2>
        <p>
          MusicXML, MXL, and PDF uploads will live here and use the same score
          viewer as the catalog.
        </p>
      </section>
    </main>
  );
}
