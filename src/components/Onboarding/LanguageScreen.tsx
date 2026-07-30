import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';
import { detectLocaleLanguage } from '../../i18n/detectLocaleLanguage';

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'fr', name: 'French', nativeName: 'Francais' },
  { code: 'es', name: 'Spanish', nativeName: 'Espanol' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Portugues' },
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
  const [navigating, setNavigating] = useState(false);

  const handleLanguageSelect = async (langCode: string) => {
    if (navigating) return;
    setSelectedLang(langCode);
    setNavigating(true);
    await i18n.changeLanguage(langCode);
    localStorage.setItem('i18nextLng', langCode);
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
              disabled={navigating}
              className="flex items-center justify-between p-4 rounded-xl transition-all group disabled:opacity-50"
              style={{
                backgroundColor: selectedLang === lang.code ? 'rgb(var(--accent))' : 'rgb(var(--card))',
                border: selectedLang === lang.code ? '2px solid rgb(var(--accent))' : '1px solid rgb(var(--border))',
                color: selectedLang === lang.code ? '#000' : 'rgb(var(--fg))',
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
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default LanguageScreen;
