const NAV_ITEMS = [
  { id: "catalog", label: "Catalog" },
  { id: "uploads", label: "Uploads" },
];

export function Sidebar({
  activeTab,
  onTabChange,
  savedScores,
  uploadedScores,
  selectedScore,
  onSelectScore,
}) {
  const navItems = selectedScore
    ? [...NAV_ITEMS, { id: "viewer", label: "Score Viewer" }]
    : NAV_ITEMS;
  const sidebarTitle = activeTab === "uploads" ? "Uploaded Scores" : "Saved Scores";
  const sidebarScores = activeTab === "uploads" ? uploadedScores : savedScores;
  const emptyText =
    activeTab === "uploads"
      ? "Uploaded scores will appear here."
      : "Saved scores will appear here.";

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
        {navItems.map((item) => (
          <button
            className={item.id === activeTab ? "active" : ""}
            key={item.id}
            type="button"
            onClick={() => {
              if (item.id === "viewer" && selectedScore) {
                onSelectScore(selectedScore);
                return;
              }

              onTabChange(item.id);
            }}
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
                <button
                  type="button"
                  onClick={() => onSelectScore(score)}
                  aria-label={`Open ${score.songName || "score"} in score viewer`}
                >
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
