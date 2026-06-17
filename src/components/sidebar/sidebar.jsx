import scoreforgeLogo from "../../assets/scoreforge-logo-1.png";

const LEARN_ACTIVITY_PLACEHOLDERS = [
  {
    id: "intervals-practice",
    title: "Interval practice",
    detail: "Last opened lesson",
  },
  {
    id: "sight-reading",
    title: "Sight-reading warmup",
    detail: "In progress",
  },
];

export function Sidebar({
  activeTab,
  savedScores,
  uploadedScores,
  onHome,
  onSelectScore,
}) {
  const isForgeTab = activeTab === "uploads";
  const isLearnTab = activeTab === "learn";
  const sidebarTitle = isLearnTab
    ? "Recent Learning"
    : isForgeTab
      ? "Forged Scores"
      : "Saved Scores";
  const sidebarScores = isForgeTab ? uploadedScores : savedScores;
  const emptyText = isForgeTab
    ? "Forged scores will appear here."
    : "Saved scores will appear here.";

  return (
    <aside className="sidebar" aria-label="ScoreForge sidebar">
      <button
        className="sidebar-brand"
        type="button"
        onClick={onHome}
        aria-label="Go to ScoreForge catalog"
      >
        <img className="brand-mark" src={scoreforgeLogo} alt="" aria-hidden="true" />
        <div>
          <p>ScoreForge</p>
          <span>Sheet music workspace</span>
        </div>
      </button>

      <section className="sidebar-section" aria-labelledby="sidebar-list-title">
        <div className="sidebar-section-header">
          <h2 id="sidebar-list-title">{sidebarTitle}</h2>
          <span>
            {isLearnTab
              ? LEARN_ACTIVITY_PLACEHOLDERS.length
              : sidebarScores.length}
          </span>
        </div>

        {isLearnTab ? (
          <ul className="sidebar-score-list sidebar-activity-list">
            {LEARN_ACTIVITY_PLACEHOLDERS.map((activity) => (
              <li key={activity.id}>
                <div className="sidebar-activity-preview">
                  <span>{activity.title}</span>
                  <small>{activity.detail}</small>
                </div>
              </li>
            ))}
          </ul>
        ) : sidebarScores.length > 0 ? (
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
