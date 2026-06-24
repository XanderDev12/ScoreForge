import scoreforgeLogo from "../../assets/scoreforge-logo-1.png";

const NAV_ITEMS = [
  { id: "catalog", label: "Catalog" },
  { id: "uploads", label: "Forge" },
  { id: "learn", label: "Learn" },
];

export function TopBar({
  activeTab,
  onHome,
  onSearchQueryChange,
  onSearchSubmit,
  onTabChange,
  searchQuery,
  showHomeBrand,
}) {
  function handleSearchSubmit(event) {
    event.preventDefault();
    onSearchSubmit();
  }

  return (
    <header className="top-bar">
      {showHomeBrand ? (
        <button
          className="top-bar-brand"
          type="button"
          onClick={onHome}
          aria-label="Go to ScoreForge home"
        >
          <img className="brand-mark" src={scoreforgeLogo} alt="" aria-hidden="true" />
          <span>ScoreForge</span>
        </button>
      ) : null}

      <form className="top-bar-search" onSubmit={handleSearchSubmit} role="search">
        <label htmlFor="catalog-search">Search catalog</label>
        <input
          id="catalog-search"
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Search score names or composers"
        />
      </form>

      <nav className="top-bar-tabs" aria-label="Primary">
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

      <div className="profile-button" aria-label="Profile placeholder" role="img">
        <span aria-hidden="true">SF</span>
      </div>
    </header>
  );
}
