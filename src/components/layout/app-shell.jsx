import { useState } from "react";
import { Sidebar } from "../sidebar/sidebar.jsx";
import { TopBar } from "./top-bar.jsx";

const DEFAULT_SIDEBAR_WIDTH = 280;
const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 440;

export function AppShell({
  activeTab,
  isHomeView,
  onOpenAccount,
  onSignOut,
  onTabChange,
  onHome,
  onToggleSavedScore,
  pendingSavedScoreIds,
  savedScores,
  savedScoresError,
  searchQuery,
  onSearchQueryChange,
  onSearchSubmit,
  uploadedScores,
  onSelectScore,
  profile,
  user,
  children,
}) {
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);

  function handleResizeStart(event) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const resizeHandle = event.currentTarget;
    const startX = event.clientX;
    const startWidth = sidebarWidth;

    function handlePointerMove(moveEvent) {
      const nextWidth = startWidth + moveEvent.clientX - startX;
      setSidebarWidth(clampSidebarWidth(nextWidth));
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

  return (
    <div
      className={isHomeView ? "app-shell home-shell" : "app-shell"}
      style={{ "--sidebar-width": `${sidebarWidth}px` }}
    >
      {isHomeView ? null : (
        <>
          <Sidebar
            activeTab={activeTab}
            savedScores={savedScores}
            uploadedScores={uploadedScores}
            onHome={onHome}
            onSelectScore={onSelectScore}
            onToggleSavedScore={onToggleSavedScore}
            pendingSavedScoreIds={pendingSavedScoreIds}
            savedScoresError={savedScoresError}
          />
          <button
            className="sidebar-resize-handle"
            type="button"
            onPointerDown={handleResizeStart}
            aria-label="Resize sidebar"
          />
        </>
      )}
      <div className="app-main">
        <TopBar
          activeTab={activeTab}
          onOpenAccount={onOpenAccount}
          onHome={onHome}
          onSignOut={onSignOut}
          onTabChange={onTabChange}
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
          onSearchSubmit={onSearchSubmit}
          profile={profile}
          showHomeBrand={isHomeView}
          user={user}
        />
        <div className="app-content">{children}</div>
      </div>
    </div>
  );
}

function clampSidebarWidth(width) {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width));
}
