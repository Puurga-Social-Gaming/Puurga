import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Sun, Moon, Globe } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const QuickActions: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-card border border-border hover:bg-highlight-light shadow-theme-sm hover:shadow-theme-md transition-all"
        aria-label="Quick actions"
        title="Options"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-foreground relative">
          <div className="absolute -top-2.5 left-0 w-1.5 h-1.5 rounded-full bg-foreground"></div>
          <div className="absolute -bottom-2.5 left-0 w-1.5 h-1.5 rounded-full bg-foreground"></div>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-theme-md overflow-hidden z-50">
          {/* Theme Toggle */}
          <div className="p-2">
            <button
              onClick={() => {
                toggleTheme();
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between px-4 py-2 text-left text-foreground hover:bg-highlight-light rounded-md transition-colors"
            >
              <div className="flex items-center gap-3">
                {theme === 'dark' ? (
                  <Sun size={18} className="text-amber-400" />
                ) : (
                  <Moon size={18} className="text-indigo-600" />
                )}
                <span>{t(theme === 'dark' ? 'theme.lightMode' : 'theme.darkMode')}</span>
              </div>
              <span className="text-muted text-sm">
                {theme === 'dark' ? 'Light' : 'Dark'}
              </span>
            </button>

            {/* Language Selector */}
            <div className="mt-1">
              {[
                { code: 'en', name: 'English' },
                { code: 'fr', name: 'Français' },
                { code: 'zu', name: 'Zulu' },
                { code: 'ss', name: 'Swati' },
              ].map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    i18n.changeLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center px-4 py-2 text-left text-sm rounded-md transition-colors ${i18n.language.startsWith(lang.code)
                      ? 'bg-highlight-light text-accent font-medium'
                      : 'text-foreground hover:bg-highlight-light'
                    }`}
                >
                  <Globe size={16} className="mr-3 text-muted" />
                  {lang.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickActions;
