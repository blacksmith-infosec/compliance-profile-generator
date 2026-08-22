import { useTheme } from '../../providers/ThemeProvider';

export const Header = () => {
  const { theme, toggleTheme } = useTheme();

  const sunIcon = (
    <svg className="icon-sun" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" fill="currentColor"/>
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="12" y1="2" x2="12" y2="5"/>
        <line x1="12" y1="19" x2="12" y2="22"/>
        <line x1="2" y1="12" x2="5" y2="12"/>
        <line x1="19" y1="12" x2="22" y2="12"/>
        <line x1="4.5" y1="4.5" x2="6.5" y2="6.5"/>
        <line x1="17.5" y1="17.5" x2="19.5" y2="19.5"/>
        <line x1="4.5" y1="19.5" x2="6.5" y2="17.5"/>
        <line x1="17.5" y1="6.5" x2="19.5" y2="4.5"/>
      </g>
    </svg>
  );
  const moonIcon = (
    <svg className="icon-moon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="currentColor"/>
    </svg>
  );
  return (
    <header className="site-header">
      <div className="container header-inner">
        <div className="brand" aria-label="Blacksmith Compliance Profile Generator">
          {theme === 'light' ?
            <img className="brand-mark brand-mark-light" 
                 src="assets/Dark_Blue.svg" 
                 alt="Blacksmith logo" /> 
            : 
            <img className="brand-mark brand-mark-dark" 
                 src="assets/Bright_Blue.svg" 
                 alt="Blacksmith logo" />
          }
          <div className="brand-text">
            <span className="brand-name">
              Blacksmith
              <span className="brand-dot">.</span>
            </span>
            <span className="brand-sub">Compliance Profile Generator</span>
          </div>
        </div>

        <div className="header-actions">
          <nav className="header-nav">
            <a href="https://github.com/blacksmith-infosec/compliance-profile-generator" 
               target="_blank" 
               rel="noopener noreferrer">
              GitHub
            </a>
            <a href="https://blacksmithinfosec.com" 
               target="_blank" 
               rel="noopener noreferrer">
              Blacksmith
            </a>
          </nav>
          <button type="button" 
                  id="theme-toggle" 
                  className="theme-toggle" 
                  aria-label="Toggle theme" 
                  title="Toggle theme"
                  onClick={toggleTheme}>
            {theme === 'light' ? sunIcon : moonIcon}
          </button>
        </div>
      </div>
    </header>
  );
};
