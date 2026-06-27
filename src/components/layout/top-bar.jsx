import { useState } from "react";
import scoreforgeLogo from "../../assets/scoreforge-logo-1.png";

const NAV_ITEMS = [
  { id: "catalog", label: "Catalog" },
  { id: "uploads", label: "Forge" },
  { id: "learn", label: "Learn" },
];

export function TopBar({
  activeTab,
  onHome,
  onOpenAuth,
  onSearchQueryChange,
  onSearchSubmit,
  onSignOut,
  onTabChange,
  profile,
  searchQuery,
  showHomeBrand,
  user,
}) {
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  function handleSearchSubmit(event) {
    event.preventDefault();
    onSearchSubmit();
  }

  function handleAccountAction(mode) {
    setIsAccountMenuOpen(false);
    onOpenAuth(mode);
  }

  function handleSignOut() {
    setIsAccountMenuOpen(false);
    onSignOut();
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

      <div
        className="profile-menu"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsAccountMenuOpen(false);
          }
        }}
      >
        <button
          className="profile-button"
          type="button"
          aria-expanded={isAccountMenuOpen}
          aria-haspopup="menu"
          aria-label="Open account menu"
          onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
        >
          <span aria-hidden="true">{getAccountInitials({ profile, user })}</span>
        </button>

        {isAccountMenuOpen ? (
          <div className="profile-dropdown" role="menu" aria-label="Account actions">
            {user ? (
              <>
                <p>{profile?.display_name || user.email}</p>
                <button type="button" role="menuitem" onClick={handleSignOut}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <button type="button" role="menuitem" onClick={() => handleAccountAction("sign-in")}>
                  Sign in
                </button>
                <button type="button" role="menuitem" onClick={() => handleAccountAction("sign-up")}>
                  Sign up
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
    </header>
  );
}

function getAccountInitials({ profile, user }) {
  const label = profile?.display_name || user?.email;

  if (!label) {
    return "SF";
  }

  return label.slice(0, 2).toUpperCase();
}
