function Navbar({
  brand,
  links,
  languages,
  currentLanguage,
  onLanguageChange,
  isHidden,
}) {
  return (
    <header className={`site-header ${isHidden ? "site-header--hidden" : ""}`}>
      <nav className="navbar container" aria-label="Primary">
        <a href="#register" className="brand">
          {brand}
        </a>

        <div className="nav-actions">
          <div className="nav-links">
            {links.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </div>

          <div className="language-switcher" aria-label="Language switcher">
            {languages.map((language) => (
              <button
                key={language.code}
                type="button"
                className={`language-switcher__button ${
                  currentLanguage === language.code ? "is-active" : ""
                }`}
                onClick={() => onLanguageChange(language.code)}
              >
                {language.label}
              </button>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
