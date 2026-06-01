import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { updateUserLanguage } from '../services/languageService';
import { Globe } from 'lucide-react';
import { toast } from 'react-hot-toast';

const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
    { code: 'zh', name: 'Chinese', nativeName: '中文' },
];

interface LanguageSelectorProps {
    className?: string;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className = '' }) => {
    const { t, i18n } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);

    const handleLanguageChange = async (code: string) => {
        if (isLoading) return;

        try {
            setIsLoading(true);
            // First change the language in i18n (instant UI update)
            await i18n.changeLanguage(code);
            
            // Then update on backend
            try {
                await updateUserLanguage(code);
                toast.success(`Language changed to ${languages.find(l => l.code === code)?.name}`);
            } catch (error) {
                // Language changed in UI but failed on backend - still acceptable
                console.warn('Language updated locally but failed to save on backend:', error);
                toast.success(`Language changed to ${languages.find(l => l.code === code)?.name}`);
            }
        } catch (error) {
            console.error('Failed to change language:', error);
            toast.error('Failed to change language');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`relative group ${className}`}>
            <button
                className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={t('settings.selectLanguage')}
                disabled={isLoading}
            >
                <Globe size={20} />
                <span className="hidden md:inline text-sm font-medium">
                    {languages.find(l => l.code === i18n.language)?.name || 'Language'}
                </span>
            </button>

            {/* Dropdown menu */}
            <div className="absolute right-0 mt-2 w-48 bg-[#1e1e1e] border border-gray-700 rounded-lg shadow-xl py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="px-4 py-2 border-b border-gray-700">
                    <p className="text-xs text-gray-400 font-semibold uppercase">{t('settings.language')}</p>
                </div>

                {languages.map((lang) => (
                    <button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        disabled={isLoading}
                        className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${i18n.language === lang.code ? 'text-blue-400 font-medium' : 'text-gray-300'
                            }`}
                    >
                        <span>{lang.nativeName}</span>
                        {i18n.language === lang.code && (
                            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default LanguageSelector;
