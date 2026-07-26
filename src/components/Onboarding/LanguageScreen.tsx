import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Globe, ChevronRight } from 'lucide-react';
import { detectLocaleLanguage } from '../../i18n/detectLocaleLanguage';

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
];

const LanguageScreen: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const detected = (() => {
    const current = (i18n.language || '').split('-')[0];
    if (LANGUAGES.some((l) => l.code === current)) return current;
    return detectLocaleLanguage();
  })();
  const [selectedLang, setSelectedLang] = useState<string>(detected);

  const handleLanguageSelect = async (langCode: string) => {
    setSelectedLang(langCode);
    await i18n.changeLanguage(langCode);
    localStorage.setItem('i18nextLng', langCode);
  };

  const handleContinue = async () => {
    const lang = selectedLang || detectLocaleLanguage();
    await i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
    localStorage.setItem('hasSeenIntro', 'true');
    navigate('/onboarding/welcome');
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ backgroundColor: 'rgb(var(--bg))', color: 'rgb(var(--fg))' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.1 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center gap-3 mb-8">
          <Globe size={32} style={{ color: 'rgb(var(--accent))' }} />
          <h1
            className="text-2xl font-bold"
            style={{ color: 'rgb(var(--fg))' }}
          >
            {t('onboarding.selectLanguage') || 'Select your language'}
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {LANGUAGES.map((lang, index) => (
            <motion.button
              key={lang.code}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleLanguageSelect(lang.code)}
              className="flex items-center justify-between p-4 rounded-xl transition-all group"
              style={{
                backgroundColor: selectedLang === lang.code ? 'rgb(var(--accent))' : 'rgb(var(--card))',
                border: selectedLang === lang.code ? '2px solid rgb(var(--accent))' : '1px solid rgb(var(--border))',
                color: selectedLang === lang.code ? '#000' : 'rgb(var(--fg))',
              }}
              onMouseEnter={(e) => {
                if (selectedLang !== lang.code) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgb(var(--accent))';
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgb(var(--card-hover))';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedLang !== lang.code) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgb(var(--border))';
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgb(var(--card))';
                }
              }}
            >
              <div className="text-left">
                <p className="font-medium" style={{ color: selectedLang === lang.code ? '#000' : 'rgb(var(--fg))' }}>
                  {lang.nativeName}
                </p>
                <p className="text-sm" style={{ color: selectedLang === lang.code ? '#000' : 'rgb(var(--muted))' }}>
                  {lang.name}
                </p>
              </div>
              <ChevronRight size={18} style={{ color: 'rgb(var(--muted))' }} />
            </motion.button>
          ))}
        </div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={handleContinue}
          disabled={!selectedLang}
          className="w-full mt-6 p-4 font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={
            selectedLang
              ? { backgroundColor: 'rgb(var(--accent))', color: '#000' }
              : { backgroundColor: 'rgba(var(--muted), 0.2)', color: 'rgb(var(--muted))' }
          }
        >
          {t('common.continue') || 'Continue'}
        </motion.button>
      </motion.div>
    </div>
  );
};

export default LanguageScreen;
