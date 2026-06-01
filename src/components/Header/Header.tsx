import React, { useState, useRef, useEffect } from 'react';
import { Bell, Globe, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import NavLink from './NavLink';
import PuurgaLogo from '../Icons/PuurgaLogo';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { updateUserLanguage } from '../../services/languageService';

interface HeaderProps {
  className?: string;
}

/** Match mobile footer nav icon size (MainNav) */
const HEADER_ICON_SIZE = 18;

const Header: React.FC<HeaderProps> = ({ className }) => {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'zu', name: 'Zulu', nativeName: 'isiZulu' },
    { code: 'ss', name: 'Siswati', nativeName: 'SiSwati' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
    { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
    { code: 'zh', name: 'Chinese', nativeName: '中文' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  ];

  const handleLanguageChange = async (code: string) => {
    if (isChangingLanguage) return;
    try {
      setIsChangingLanguage(true);
      await i18n.changeLanguage(code);
      try {
        await updateUserLanguage(code);
        toast.success(`Language changed to ${languages.find(l => l.code === code)?.name}`);
      } catch (error) {
        console.warn('Language updated locally but failed to save on backend:', error);
        toast.success(`Language changed to ${languages.find(l => l.code === code)?.name}`);
      }
    } catch (error) {
      console.error('Failed to change language:', error);
      toast.error('Failed to change language');
    } finally {
      setIsChangingLanguage(false);
      setLanguageMenuOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target as Node)) {
        setLanguageMenuOpen(false);
      }
    };
    if (languageMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [languageMenuOpen]);

  return (
    <header className={cn(
      "fixed top-0 z-50 w-full bg-background/80 backdrop-blur-lg border-b border-border",
      className
    )}>
      <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3 flex justify-between items-center">
        <Link to="/home" className="flex items-center">
           <PuurgaLogo size={36} className="text-white sm:w-12 sm:h-12" />
        </Link>
        <nav className="flex items-center space-x-2 sm:space-x-2.5">
          <NavLink to="/notifications" icon={<Bell size={HEADER_ICON_SIZE} />} />
          <button
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
            title={theme === 'dark' ? t('settings.lightMode') : t('settings.darkMode')}
          >
            {theme === 'dark' ? (
              <Sun size={HEADER_ICON_SIZE} />
            ) : (
              <Moon size={HEADER_ICON_SIZE} />
            )}
          </button>
          <div className="relative" ref={languageMenuRef}>
            <button
              onClick={() => setLanguageMenuOpen(!languageMenuOpen)}
              className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
              title={t('settings.language')}
            >
              <Globe size={HEADER_ICON_SIZE} />
            </button>
            {languageMenuOpen && (
              <div className="absolute right-0 mt-2 bg-card border border-border rounded-lg shadow-lg min-w-[140px] z-50">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    disabled={isChangingLanguage}
                    className={`block w-full text-left px-3 py-2 text-xs text-foreground hover:bg-card-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      i18n.language === lang.code ? 'bg-card-hover font-medium' : ''
                    }`}
                  >
                    {lang.nativeName}
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;