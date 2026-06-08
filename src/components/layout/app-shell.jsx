import { useState } from "react";
import { Sidebar } from "../sidebar/sidebar.jsx";

const DEFAULT_SIDEBAR_WIDTH = 280;
const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 440;

export function AppShell({
  activeTab,
  onTabChange,
  savedScores,
  uploadedScores,
  selectedScore,
  onSelectScore,
  children,
}) {
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);

  function handleResizeStart(event) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const startX = event.clientX;
    const startWidth = sidebarWidth;

    function handlePointerMove(moveEvent) {
      const nextWidth = startWidth + moveEvent.clientX - startX;
      setSidebarWidth(clampSidebarWidth(nextWidth));
    }

    function handlePointerUp() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  }

  return (
    <div className="app-shell" style={{ "--sidebar-width": `${sidebarWidth}px` }}>
      <Sidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        savedScores={savedScores}
        uploadedScores={uploadedScores}
        selectedScore={selectedScore}
        onSelectScore={onSelectScore}
      />
      <button
        className="sidebar-resize-handle"
        type="button"
        onPointerDown={handleResizeStart}
        aria-label="Resize sidebar"
      />
      <div className="app-content">{children}</div>
    </div>
  );
}

function clampSidebarWidth(width) {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width));
}
