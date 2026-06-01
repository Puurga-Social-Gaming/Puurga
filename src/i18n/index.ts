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

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        supportedLngs: ['en', 'fr', 'zu', 'ss', 'es', 'pt', 'sw', 'zh', 'ar', 'hi'],
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'i18nextLng',
        },
    });

export default i18n;
