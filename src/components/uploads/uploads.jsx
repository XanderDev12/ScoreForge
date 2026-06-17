export function Uploads({ uploadedScores }) {
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

      <section className="uploads-placeholder" aria-label="Forge">
        <h2>Forge workspace</h2>
        <p>
          MusicXML, MXL, and PDF uploads will be shaped here and use the same score
          viewer as the catalog.
        </p>
      </section>
    </main>
  );
}
