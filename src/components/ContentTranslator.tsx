import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { translateContent, translateText } from '../services/languageService';
import { Globe } from 'lucide-react';

interface ContentTranslatorProps {
  content: string;
  sourceType: 'post' | 'comment' | 'message' | 'group_message' | 'notification' | 'story';
  sourceId: string;
  originalLanguage?: string;
  /** Pre-translated text from backend/WS (preferred — no extra request) */
  translatedContent?: string | null;
  translatedLanguage?: string | null;
  /** When true (default), show translation automatically if languages differ */
  autoTranslate?: boolean;
  /** Always show Translate / View original controls (for testing & messages UX) */
  alwaysShowControls?: boolean;
  className?: string;
  renderContent?: (text: string) => React.ReactNode;
}

function normLang(code?: string | null) {
  if (!code) return 'en';
  return String(code).toLowerCase().split(/[-_]/)[0];
}

function sameText(a?: string | null, b?: string | null) {
  return (a || '').trim() === (b || '').trim();
}

function isFakeTranslation(translated?: string | null, original?: string | null) {
  const t = (translated || '').trim();
  const o = (original || '').trim();
  if (!t) return true;
  if (sameText(t, o)) return true;
  // Old mock format from missing API key: "[fr] Yes am busy..."
  if (/^\[[a-z]{2}(-[a-z]+)?\]\s+/i.test(t) && o && t.includes(o)) return true;
  return false;
}

function readAlwaysTranslate(): boolean {
  try {
    return localStorage.getItem('puurga_always_translate') !== '0';
  } catch {
    return true;
  }
}

type TranslateResult = {
  translatedText?: string;
  originalLanguage?: string;
  skipped?: boolean;
} | null;

async function translateWithFallback(
  sourceType: ContentTranslatorProps['sourceType'],
  sourceId: string,
  content: string,
  currentLang: string,
  claimedSourceLang: string
): Promise<{ text: string; sourceLang: string } | null> {
  // 1) Try by source id
  let result: TranslateResult = await translateContent(sourceType, sourceId, currentLang);

  // 2) If skipped / unchanged / empty → translate the visible text with auto-detect
  const needFallback =
    !result?.translatedText ||
    result.skipped ||
    isFakeTranslation(result.translatedText, content);

  if (needFallback && content.trim()) {
    // Don't force claimed UI language — let the server detect from text
    result = await translateText(content, currentLang);
  }

  if (!result?.translatedText || result.skipped || isFakeTranslation(result.translatedText, content)) {
    return null;
  }

  return {
    text: result.translatedText,
    sourceLang: normLang(result.originalLanguage || claimedSourceLang),
  };
}

const ContentTranslator: React.FC<ContentTranslatorProps> = ({
  content,
  sourceType,
  sourceId,
  originalLanguage = 'en',
  translatedContent: preTranslated,
  translatedLanguage,
  autoTranslate = true,
  alwaysShowControls = false,
  className = '',
  renderContent,
}) => {
  const { t, i18n } = useTranslation();
  const currentLang = normLang(i18n.language);
  const claimedSourceLang = normLang(originalLanguage);

  const validPre =
    preTranslated &&
    !isFakeTranslation(preTranslated, content) &&
    normLang(translatedLanguage || currentLang) === currentLang
      ? preTranslated
      : null;

  const [translatedText, setTranslatedText] = useState<string | null>(validPre);
  const [detectedSourceLang, setDetectedSourceLang] = useState(claimedSourceLang);
  const [showTranslated, setShowTranslated] = useState(Boolean(validPre));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const langsLikelyDiffer = claimedSourceLang !== currentLang;
  const wantsAuto = autoTranslate && readAlwaysTranslate() && langsLikelyDiffer;

  useEffect(() => {
    if (validPre) {
      setTranslatedText(validPre);
      if (wantsAuto) setShowTranslated(true);
    } else {
      setTranslatedText(null);
      setShowTranslated(false);
    }
    setDetectedSourceLang(claimedSourceLang);
    setError(null);
  }, [validPre, claimedSourceLang, wantsAuto, content]);

  useEffect(() => {
    if (!wantsAuto) return;
    if (!content?.trim()) return;
    if (translatedText && !isFakeTranslation(translatedText, content)) {
      setShowTranslated(true);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await translateWithFallback(
          sourceType,
          sourceId,
          content,
          currentLang,
          claimedSourceLang
        );
        if (cancelled) return;
        if (result) {
          setTranslatedText(result.text);
          setDetectedSourceLang(result.sourceLang);
          setShowTranslated(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsAuto, currentLang, claimedSourceLang, sourceId, content, sourceType]);

  const handleTranslate = async () => {
    if (loading) return;
    if (translatedText && !isFakeTranslation(translatedText, content)) {
      setShowTranslated(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await translateWithFallback(
        sourceType,
        sourceId,
        content,
        currentLang,
        claimedSourceLang
      );
      if (result) {
        setTranslatedText(result.text);
        setDetectedSourceLang(result.sourceLang);
        setShowTranslated(true);
      } else {
        setError(t('common.translationFailed', 'Already in your language'));
        setShowTranslated(false);
      }
    } catch (err) {
      console.error(err);
      setError(t('common.translationFailed', 'Translation failed'));
    } finally {
      setLoading(false);
    }
  };

  const toggleTranslation = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!translatedText || isFakeTranslation(translatedText, content)) {
      void handleTranslate();
    } else {
      setShowTranslated(!showTranslated);
    }
  };

  if (!content?.trim()) {
    return renderContent ? <>{renderContent(content)}</> : null;
  }

  const showControls = alwaysShowControls || langsLikelyDiffer || Boolean(translatedText);
  if (!showControls) {
    return renderContent ? <>{renderContent(content)}</> : <span className={className}>{content}</span>;
  }

  const hasRealTranslation = Boolean(translatedText && !isFakeTranslation(translatedText, content));
  const textToDisplay = showTranslated && hasRealTranslation ? translatedText! : content;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="content-display">
        {renderContent ? renderContent(textToDisplay) : textToDisplay}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={toggleTranslation}
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold tracking-wide uppercase text-accent/90 bg-accent/10 hover:bg-accent/15 border border-accent/15 transition-colors cursor-pointer"
        >
          <Globe size={11} />
          {loading
            ? t('common.loading', 'Loading…')
            : showTranslated && hasRealTranslation
              ? t('common.viewOriginal', 'View original')
              : t('common.viewTranslated', 'Translate')}
        </button>

        {showTranslated && hasRealTranslation && (
          <span className="text-[10px] text-muted/80 italic">
            {t('common.translationDisclaimer', {
              language: detectedSourceLang.toUpperCase(),
              defaultValue: `Translated from ${detectedSourceLang.toUpperCase()}`,
            })}
          </span>
        )}

        {error && !hasRealTranslation && (
          <span className="text-[10px] text-muted/80 italic">{error}</span>
        )}
      </div>
    </div>
  );
};

export default ContentTranslator;
