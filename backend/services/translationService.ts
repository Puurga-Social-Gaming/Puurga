import OpenAI from 'openai';
import { requireSupabaseAdmin } from '../config/supabase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'mock-key',
});

export type TranslationSourceType =
  | 'post'
  | 'comment'
  | 'message'
  | 'group_message'
  | 'notification'
  | 'story'
  | 'text';

const LANG_NAMES: Record<string, string> = {
  en: 'English',
  fr: 'French',
  sw: 'Swahili',
  es: 'Spanish',
  pt: 'Portuguese',
  zh: 'Chinese',
  ar: 'Arabic',
  hi: 'Hindi',
  zu: 'Zulu',
  ss: 'Siswati',
};

const SUPPORTED = new Set(Object.keys(LANG_NAMES));

function normalizeLang(code?: string | null): string {
  if (!code) return 'en';
  return String(code).toLowerCase().split(/[-_]/)[0];
}

/** Lightweight heuristic when OpenAI is unavailable */
function heuristicDetect(text: string): string {
  const sample = text.toLowerCase();
  const frHits = (
    sample.match(
      /\b(je|tu|nous|vous|avec|pour|bonjour|merci|salut|oui|non|c'est|ça|été|être|faire|quoi|pas|une|des|les|aux|très|aussi)\b/gi
    ) || []
  ).length;
  const enHits = (
    sample.match(
      /\b(the|and|you|are|is|am|was|were|this|that|with|for|see|busy|next|time|hello|thanks|please|what|don't|can't|bro|yeah)\b/gi
    ) || []
  ).length;
  const swHits = (
    sample.match(/\b(habari|asante|karibu|nina|wewe|sawa|pole|ndugu|rafiki)\b/gi) || []
  ).length;
  const esHits = (
    sample.match(/\b(hola|gracias|porque|está|también|bueno|amigo|qué|más)\b/gi) || []
  ).length;

  const scores: Array<[string, number]> = [
    ['fr', frHits],
    ['en', enHits],
    ['sw', swHits],
    ['es', esHits],
  ];
  scores.sort((a, b) => b[1] - a[1]);
  if (scores[0][1] > 0 && scores[0][1] >= scores[1][1]) return scores[0][0];
  return 'en';
}

export class TranslationService {
  static normalizeLang = normalizeLang;

  static async getUserLanguage(userId: string): Promise<string> {
    const supabaseAdminClient = requireSupabaseAdmin();
    try {
      const { data } = await supabaseAdminClient
        .from('profiles')
        .select('language')
        .eq('id', userId)
        .maybeSingle();
      return normalizeLang(data?.language);
    } catch {
      return 'en';
    }
  }

  static async userWantsAutoTranslate(userId: string): Promise<boolean> {
    const supabaseAdminClient = requireSupabaseAdmin();
    try {
      const { data } = await supabaseAdminClient
        .from('user_settings')
        .select('settings')
        .eq('user_id', userId)
        .maybeSingle();
      const settings = (data?.settings || {}) as Record<string, unknown>;
      if (typeof settings.alwaysTranslateMessages === 'boolean') {
        return settings.alwaysTranslateMessages;
      }
      return true;
    } catch {
      return true;
    }
  }

  /**
   * Detect the real language of text content (not the sender's UI locale).
   */
  static async detectLanguage(content: string): Promise<string> {
    const text = (content || '').trim();
    if (!text) return 'en';

    if (process.env.OPENAI_API_KEY) {
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'Detect the language of the user text. Reply with ONLY a lowercase ISO 639-1 code ' +
                '(en, fr, sw, es, pt, zh, ar, hi, zu, ss). No punctuation.',
            },
            { role: 'user', content: text.slice(0, 500) },
          ],
          max_tokens: 5,
          temperature: 0,
        });
        const raw = (response.choices[0]?.message?.content || '').trim().toLowerCase();
        const code = normalizeLang(raw.replace(/[^a-z-]/g, ''));
        if (SUPPORTED.has(code)) return code;
      } catch (err) {
        console.warn('Language detection failed, using heuristic:', err);
      }
    }

    return heuristicDetect(text);
  }

  /**
   * Prefer content detection over a claimed UI language when they disagree.
   */
  static async resolveSourceLanguage(
    content: string,
    claimed?: string | null
  ): Promise<string> {
    const detected = await this.detectLanguage(content);
    const claimedNorm = claimed ? normalizeLang(claimed) : '';
    if (claimedNorm && claimedNorm !== detected) {
      return detected;
    }
    return detected || claimedNorm || 'en';
  }

  /**
   * Translate content to target language. Uses DB cache when sourceId is provided.
   */
  static async translateContent(
    sourceType: TranslationSourceType,
    sourceId: string,
    content: string,
    targetLanguage: string,
    claimedLanguage?: string | null
  ): Promise<string> {
    const supabaseAdminClient = requireSupabaseAdmin();
    if (!content?.trim()) return content || '';

    const target = normalizeLang(targetLanguage);
    // Always resolve real source language from the text — UI locale is often wrong
    const source = await this.resolveSourceLanguage(content, claimedLanguage);

    if (source === target) return content;

    try {
      if (sourceType !== 'text' || sourceId) {
        const { data: cached } = await supabaseAdminClient
          .from('translations')
          .select('translated_text')
          .eq('source_type', sourceType)
          .eq('source_id', sourceId)
          .eq('target_language', target)
          .maybeSingle();

        // Ignore bad cache that equals the original OR old mock "[fr] text" entries
        if (
          cached?.translated_text &&
          cached.translated_text.trim() !== content.trim() &&
          !this.isMockTranslation(cached.translated_text, content)
        ) {
          return cached.translated_text;
        }
      }

      const translatedText = await this.runTranslation(content, target, source);

      if (translatedText && sourceType !== 'text') {
        const { error: upsertError } = await supabaseAdminClient.from('translations').upsert(
          {
            source_type: sourceType,
            source_id: sourceId,
            target_language: target,
            translated_text: translatedText,
          },
          { onConflict: 'source_type,source_id,target_language' }
        );
        if (upsertError) {
          await supabaseAdminClient.from('translations').insert({
            source_type: sourceType,
            source_id: sourceId,
            target_language: target,
            translated_text: translatedText,
          });
        }
      }

      return translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      return content;
    }
  }

  static async translateForRecipient(params: {
    sourceType: TranslationSourceType;
    sourceId: string;
    content: string;
    recipientId: string;
    claimedLanguage?: string | null;
  }): Promise<{ translatedContent: string | null; translatedLanguage: string | null }> {
    const supabaseAdminClient = requireSupabaseAdmin();
    const target = await this.getUserLanguage(params.recipientId);
    if (!params.content?.trim()) {
      return { translatedContent: null, translatedLanguage: null };
    }

    const source = await this.resolveSourceLanguage(params.content, params.claimedLanguage);
    if (source === target) {
      return { translatedContent: null, translatedLanguage: null };
    }

    const wants = await this.userWantsAutoTranslate(params.recipientId);
    if (!wants) {
      return { translatedContent: null, translatedLanguage: null };
    }

    const translatedContent = await this.translateContent(
      params.sourceType,
      params.sourceId,
      params.content,
      target,
      source
    );

    if (!translatedContent || translatedContent.trim() === params.content.trim()) {
      return { translatedContent: null, translatedLanguage: null };
    }

    return { translatedContent, translatedLanguage: target };
  }

  private static isMockTranslation(text: string, original: string): boolean {
    const t = (text || '').trim();
    const o = (original || '').trim();
    if (!t) return true;
    if (/^\[[a-z]{2}(-[a-z]+)?\]\s+/i.test(t) && t.includes(o)) return true;
    return false;
  }

  private static async translateViaMyMemory(
    content: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<string | null> {
    try {
      const source = sourceLanguage || 'Autodetect';
      const langpair =
        !sourceLanguage ||
        sourceLanguage === 'autodetect' ||
        sourceLanguage === 'Autodetect' ||
        sourceLanguage === targetLanguage
          ? `Autodetect|${targetLanguage}`
          : `${source}|${targetLanguage}`;

      // Free public endpoint — no API key required for light usage
      const url =
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(content.slice(0, 450))}` +
        `&langpair=${encodeURIComponent(langpair)}`;

      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        responseData?: { translatedText?: string };
        responseStatus?: number | string;
      };
      const translated = data?.responseData?.translatedText?.trim();
      if (!translated) return null;
      // MyMemory sometimes returns "QUERY LENGTH LIMIT EXCEEDED" etc.
      if (/QUERY LENGTH|INVALID|ERROR/i.test(translated)) return null;
      if (this.isMockTranslation(translated, content)) return null;
      return translated;
    } catch (err) {
      console.warn('MyMemory translation failed:', err);
      return null;
    }
  }

  private static async translateViaLibreTranslate(
    content: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<string | null> {
    try {
      const res = await fetch('https://libretranslate.com/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          q: content.slice(0, 1000),
          source: sourceLanguage && sourceLanguage !== targetLanguage ? sourceLanguage : 'auto',
          target: targetLanguage,
          format: 'text',
        }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { translatedText?: string };
      const translated = data?.translatedText?.trim();
      if (!translated || this.isMockTranslation(translated, content)) return null;
      return translated;
    } catch (err) {
      console.warn('LibreTranslate failed:', err);
      return null;
    }
  }

  private static async runTranslation(
    content: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<string> {
    const targetName = LANG_NAMES[targetLanguage] || targetLanguage;
    const sourceName = sourceLanguage
      ? LANG_NAMES[sourceLanguage] || sourceLanguage
      : null;

    // 1) OpenAI when configured
    if (process.env.OPENAI_API_KEY) {
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                `You are a professional translator for a social app (Puurga). ` +
                `Translate the user message into ${targetName}. ` +
                (sourceName
                  ? `The source language is ${sourceName}, but if the text is clearly in another language, translate from the actual language. `
                  : `Auto-detect the source language. `) +
                `Preserve emojis, @mentions, URLs, and line breaks. ` +
                `Return ONLY the translated text — no quotes, no explanation. ` +
                `If the text is already in ${targetName}, return it unchanged.`,
            },
            { role: 'user', content },
          ],
          max_tokens: 800,
          temperature: 0.2,
        });
        const out = (response.choices[0]?.message?.content || content).trim();
        if (out && !this.isMockTranslation(out, content)) return out;
      } catch (err) {
        console.warn('OpenAI translation failed, falling back:', err);
      }
    }

    // 2) Free public translators (no i18n — i18n only covers fixed UI strings)
    const myMemory = await this.translateViaMyMemory(content, targetLanguage, sourceLanguage);
    if (myMemory) return myMemory;

    const libre = await this.translateViaLibreTranslate(content, targetLanguage, sourceLanguage);
    if (libre) return libre;

    console.warn('All translation providers failed — returning original text');
    return content;
  }
}
