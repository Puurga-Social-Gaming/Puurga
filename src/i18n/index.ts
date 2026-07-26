import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import fr from './locales/fr.json';
import zu from './locales/zu.json';
import ss from './locales/ss.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import sw from './locales/sw.json';
import zh from './locales/zh.json';
import ar from './locales/ar.json';
import hi from './locales/hi.json';
import { detectLocaleLanguage, SUPPORTED_LANGUAGES } from './detectLocaleLanguage';

const resources = {
    en: { translation: en },
    fr: { translation: fr },
    zu: { translation: zu },
    ss: { translation: ss },
    es: { translation: es },
    pt: { translation: pt },
    sw: { translation: sw },
    zh: { translation: zh },
    ar: { translation: ar },
    hi: { translation: hi },
};

/** Custom detector: country/locale → language (only used when no saved preference) */
const countryLocaleDetector = {
    name: 'countryLocale',
    lookup() {
        try {
            return detectLocaleLanguage();
        } catch {
            return undefined;
        }
    },
    cacheUserLanguage() {
        // i18next localStorage detector handles caching after first resolve
    },
};

const languageDetector = new LanguageDetector();
languageDetector.addDetector(countryLocaleDetector);

i18n
    .use(languageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        supportedLngs: [...SUPPORTED_LANGUAGES],
        nonExplicitSupportedLngs: true,
        interpolation: {
            escapeValue: false,
        },
        detection: {
            // Saved choice first; then country/locale; then raw navigator
            order: ['localStorage', 'countryLocale', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'i18nextLng',
            convertDetectedLanguage: (lng: string) => {
                const base = (lng || 'en').split('-')[0].toLowerCase();
                if (base === 'zh') return 'zh';
                return (SUPPORTED_LANGUAGES as readonly string[]).includes(base) ? base : 'en';
            },
        },
    });

export default i18n;
