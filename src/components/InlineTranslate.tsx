import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Loader2 } from 'lucide-react';
import { translateText } from '../services/languageService';

interface InlineTranslateProps {
  content: string;
  claimedLanguage?: string;
  className?: string;
  /** Dark text (own accent bubble / dark comment chip) */
  tone?: 'default' | 'muted' | 'onAccent';
  renderContent?: (text: string) => React.ReactNode;
  /** Hide built-in translate chip (use external action-bar icon) */
  showControl?: boolean;
  /** Increment to trigger translate / toggle from parent */
  triggerToken?: number;
  /** Called when translation view toggles */
  onTranslatedChange?: (showing: boolean) => void;
}

function normLang(code?: string | null) {
  if (!code) return 'en';
  return String(code).toLowerCase().split(/[-_]/)[0];
}

function isFake(translated: string, original: string) {
  const t = translated.trim();
  const o = original.trim();
  if (!t || t === o) return true;
  if (/^\[[a-z]{2}\]\s+/i.test(t) && t.includes(o)) return true;
  return false;
}

/**
 * Compact translate control: click → translate to active UI language.
 * Can be driven from a parent action-bar icon via `triggerToken`.
 */
const InlineTranslate: React.FC<InlineTranslateProps> = ({
  content,
  claimedLanguage,
  className = '',
  tone = 'default',
  renderContent,
  showControl = true,
  triggerToken = 0,
  onTranslatedChange,
}) => {
  const { t, i18n } = useTranslation();
  const currentLang = normLang(i18n.language);
  const [loading, setLoading] = useState(false);
  const [translated, setTranslated] = useState<string | null>(null);
  const [showTranslated, setShowTranslated] = useState(false);
  const [sourceLang, setSourceLang] = useState(normLang(claimedLanguage));
  const lastTrigger = useRef(0);
  const contentRef = useRef(content);
  contentRef.current = content;

  const toneClass =
    tone === 'onAccent'
      ? 'text-black/55 hover:text-black/80 bg-black/5 border-black/10'
      : tone === 'muted'
        ? 'text-muted hover:text-accent bg-accent/5 border-border/60'
        : 'text-accent/90 hover:text-accent bg-accent/10 border-accent/15';

  const runTranslate = async () => {
    const text = contentRef.current;
    if (!text?.trim()) return;

    if (translated && !isFake(translated, text)) {
      setShowTranslated((v) => {
        const next = !v;
        onTranslatedChange?.(next);
        return next;
      });
      return;
    }

    setLoading(true);
    try {
      const result = await translateText(text, currentLang);
      if (result?.translatedText && !isFake(result.translatedText, text)) {
        setTranslated(result.translatedText);
        setSourceLang(normLang(result.originalLanguage || claimedLanguage));
        setShowTranslated(true);
        onTranslatedChange?.(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!triggerToken || triggerToken === lastTrigger.current) return;
    lastTrigger.current = triggerToken;
    void runTranslate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerToken]);

  useEffect(() => {
    // Reset when post content changes
    setTranslated(null);
    setShowTranslated(false);
    setSourceLang(normLang(claimedLanguage));
  }, [content, claimedLanguage]);

  if (!content?.trim()) return null;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await runTranslate();
  };

  const display = showTranslated && translated && !isFake(translated, content) ? translated : content;

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="text-[13px] leading-relaxed break-words">
        {renderContent ? renderContent(display) : display}
      </div>

      {(showControl || (showTranslated && translated && !isFake(translated, content))) && (
        <div className="flex items-center gap-2 flex-wrap">
          {showControl && (
            <button
              type="button"
              onClick={handleClick}
              disabled={loading}
              title={t('common.viewTranslated', 'Translate')}
              aria-label={t('common.viewTranslated', 'Translate')}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border transition-colors ${toneClass}`}
            >
              {loading ? <Loader2 size={11} className="animate-spin" /> : <Globe size={11} />}
              {loading
                ? t('common.loading', 'Loading…')
                : showTranslated && translated
                  ? t('common.viewOriginal', 'View original')
                  : t('common.viewTranslated', 'Translate')}
            </button>
          )}

          {showTranslated && translated && !isFake(translated, content) && (
            <span className="text-[10px] text-muted/70 italic">
              {t('common.translationDisclaimer', {
                language: sourceLang.toUpperCase(),
                defaultValue: `Translated from ${sourceLang.toUpperCase()}`,
              })}
            </span>
          )}
        </div>
      )}

      {loading && !showControl && (
        <span className="inline-flex items-center gap-1 text-[10px] text-muted">
          <Loader2 size={11} className="animate-spin" />
          {t('common.loading', 'Loading…')}
        </span>
      )}
    </div>
  );
};

export default InlineTranslate;
