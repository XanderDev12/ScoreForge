const NAV_ITEMS = [
  { id: "catalog", label: "Catalog" },
  { id: "uploads", label: "Uploads" },
];

export function Sidebar({ activeTab, onTabChange, savedScores, uploadedScores }) {
  const sidebarTitle = activeTab === "catalog" ? "Saved Scores" : "Uploaded Scores";
  const sidebarScores = activeTab === "catalog" ? savedScores : uploadedScores;
  const emptyText =
    activeTab === "catalog"
      ? "Saved scores will appear here."
      : "Uploaded scores will appear here.";

  return (
    <aside className="sidebar" aria-label="ScoreForge sidebar">
      <div className="sidebar-brand">
        <span className="brand-mark" aria-hidden="true">
          SF
        </span>
        <div>
          <p>ScoreForge</p>
          <span>Sheet music workspace</span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <button
            className={item.id === activeTab ? "active" : ""}
            key={item.id}
            type="button"
            onClick={() => onTabChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <section className="sidebar-section" aria-labelledby="sidebar-list-title">
        <div className="sidebar-section-header">
          <h2 id="sidebar-list-title">{sidebarTitle}</h2>
          <span>{sidebarScores.length}</span>
        </div>

        {sidebarScores.length > 0 ? (
          <ul className="sidebar-score-list">
            {sidebarScores.map((score) => (
              <li key={score.id}>
                <button type="button">
                  <span>{score.songName || "Untitled score"}</span>
                  <small>{score.composer || "Unknown composer"}</small>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="sidebar-empty">{emptyText}</p>
        )}
      </section>
    </aside>
  );
}
