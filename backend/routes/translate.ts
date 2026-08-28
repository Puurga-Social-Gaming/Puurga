import express from 'express';
import { TranslationService } from '../services/translationService';
import { requireSupabase, requireSupabaseAdmin } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';

const router = express.Router();

const TABLE_BY_TYPE: Record<string, string> = {
  post: 'posts',
  comment: 'comments',
  message: 'messages',
  group_message: 'group_messages',
  notification: 'notifications',
  story: 'statuses',
};

/**
 * POST /api/translate
 * Translate stored content by id.
 * Body: { sourceType, sourceId, targetLanguage }
 */
router.post('/', auth, async (req: AuthRequest, res) => {
    const supabaseClient = requireSupabase();
    const supabaseAdminClient = requireSupabaseAdmin();
  try {
    const { sourceType, sourceId, targetLanguage } = req.body || {};

    if (!sourceType || !sourceId || !targetLanguage) {
      return res.status(400).json({ error: 'Missing required fields: sourceType, sourceId, targetLanguage' });
    }

    const table = TABLE_BY_TYPE[sourceType];
    if (!table) {
      return res.status(400).json({ error: 'Invalid source type' });
    }

    const db = supabaseAdminClient || supabaseClient;
    let content = '';
    let claimedLanguage = 'en';

    if (sourceType === 'notification') {
      const { data, error } = await db
        .from(table)
        .select('message, title, language')
        .eq('id', sourceId)
        .maybeSingle();
      if (error || !data) return res.status(404).json({ error: 'Content not found' });
      content = data.message || data.title || '';
      claimedLanguage = TranslationService.normalizeLang(data.language);
    } else if (sourceType === 'story') {
      const { data, error } = await db
        .from(table)
        .select('content, language')
        .eq('id', sourceId)
        .maybeSingle();
      if (error || !data) return res.status(404).json({ error: 'Content not found' });
      content = data.content || '';
      claimedLanguage = TranslationService.normalizeLang(data.language);
    } else {
      const { data, error } = await db
        .from(table)
        .select('content, language')
        .eq('id', sourceId)
        .maybeSingle();

      if (error || !data) {
        const retry = await db.from(table).select('content').eq('id', sourceId).maybeSingle();
        if (retry.error || !retry.data) return res.status(404).json({ error: 'Content not found' });
        content = retry.data.content || '';
      } else {
        content = data.content || '';
        claimedLanguage = TranslationService.normalizeLang((data as any).language);
      }
    }

    if (!content.trim()) {
      return res.json({
        translatedText: content,
        originalLanguage: claimedLanguage,
        skipped: true,
      });
    }

    const target = TranslationService.normalizeLang(targetLanguage);
    // Detect real language from text — stored language is often the sender UI locale
    const originalLanguage = await TranslationService.resolveSourceLanguage(
      content,
      claimedLanguage
    );

    if (originalLanguage === target) {
      return res.json({
        translatedText: content,
        originalLanguage,
        targetLanguage: target,
        skipped: true,
      });
    }

    const translatedText = await TranslationService.translateContent(
      sourceType,
      sourceId,
      content,
      target,
      originalLanguage
    );

    const unchanged =
      !translatedText || translatedText.trim() === content.trim();

    res.json({
      translatedText: unchanged ? content : translatedText,
      originalLanguage,
      targetLanguage: target,
      skipped: unchanged,
    });
  } catch (error) {
    console.error('Translation endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/translate/text
 * Translate arbitrary text (ephemeral — still useful for preview).
 * Body: { text, targetLanguage, sourceLanguage? }
 */
router.post('/text', auth, async (req: AuthRequest, res) => {
    const supabaseClient = requireSupabase();
    const supabaseAdminClient = requireSupabaseAdmin();
  try {
    const { text, targetLanguage, sourceLanguage } = req.body || {};
    if (!text || !targetLanguage) {
      return res.status(400).json({ error: 'text and targetLanguage are required' });
    }

    const target = TranslationService.normalizeLang(targetLanguage);
    const originalLanguage = await TranslationService.resolveSourceLanguage(
      String(text),
      sourceLanguage
    );

    if (originalLanguage === target) {
      return res.json({
        translatedText: text,
        originalLanguage,
        targetLanguage: target,
        skipped: true,
      });
    }

    const hashId = Buffer.from(`${originalLanguage}:${target}:${text}`)
      .toString('base64')
      .slice(0, 64);
    const translatedText = await TranslationService.translateContent(
      'text',
      hashId,
      String(text),
      target,
      originalLanguage
    );

    const unchanged =
      !translatedText || translatedText.trim() === String(text).trim();

    res.json({
      translatedText: unchanged ? text : translatedText,
      targetLanguage: target,
      originalLanguage,
      skipped: unchanged,
    });
  } catch (error) {
    console.error('Translate text error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
