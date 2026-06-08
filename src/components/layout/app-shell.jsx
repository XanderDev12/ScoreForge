import { Sidebar } from "../sidebar/sidebar.jsx";

export function AppShell({
  activeTab,
  onTabChange,
  savedScores,
  uploadedScores,
  children,
}) {
  return (
    <div className="app-shell">
      <Sidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        savedScores={savedScores}
        uploadedScores={uploadedScores}
      />
      <div className="app-content">{children}</div>
    </div>
  );
}
