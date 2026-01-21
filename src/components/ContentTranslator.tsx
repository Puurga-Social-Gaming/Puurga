import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { translateContent } from '../services/languageService';
import { Globe } from 'lucide-react';

interface ContentTranslatorProps {
    content: string;
    sourceType: 'post' | 'comment' | 'message' | 'notification';
    sourceId: string;
    originalLanguage?: string;
    className?: string;
    renderContent?: (text: string) => React.ReactNode; // Optional custom renderer
}

const ContentTranslator: React.FC<ContentTranslatorProps> = ({
    content,
    sourceType,
    sourceId,
    originalLanguage = 'en',
    className = '',
    renderContent
}) => {
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language;

    const [translatedText, setTranslatedText] = useState<string | null>(null);
    const [showTranslated, setShowTranslated] = useState(false);
    const [loading, setLoading] = useState(false);

    // Auto-translate logic
    useEffect(() => {
        // If user's language is different from content language and not English default
        // We attempt to translate automatically
        if (currentLang !== originalLanguage && currentLang !== 'en' && !translatedText) {
            handleTranslate();
        }
    }, [currentLang, originalLanguage, sourceId]);

    const handleTranslate = async () => {
        if (loading) return;

        if (translatedText) {
            setShowTranslated(true);
            return;
        }

        setLoading(true);
        try {
            const result = await translateContent(sourceType, sourceId, currentLang);
            if (result && result.translatedText) {
                setTranslatedText(result.translatedText);
                setShowTranslated(true);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleTranslation = (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent bubbling if inside a link/button
        e.stopPropagation();

        if (!translatedText) {
            handleTranslate();
        } else {
            setShowTranslated(!showTranslated);
        }
    };

    // If languages match, just render content
    if (currentLang === originalLanguage) {
        return renderContent ? <>{renderContent(content)}</> : <span className={className}>{content}</span>;
    }

    const textToDisplay = showTranslated && translatedText ? translatedText : content;

    return (
        <div className={`space-y-1 ${className}`}>
            <div className="content-display">
                {renderContent ? renderContent(textToDisplay) : textToDisplay}
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={toggleTranslation}
                    className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors font-medium bg-transparent border-none p-0 cursor-pointer"
                >
                    <Globe size={12} />
                    {loading ? t('common.loading') : (
                        showTranslated ? t('common.viewOriginal') : t('common.viewTranslated')
                    )}
                </button>

                {showTranslated && translatedText && (
                    <span className="text-[10px] text-muted italic">
                        {t('common.translationDisclaimer', { language: originalLanguage })}
                        {currentLang === 'ss' && ` • ${t('common.siswatiDisclaimer')}`}
                    </span>
                )}
            </div>
        </div>
    );
};

export default ContentTranslator;
