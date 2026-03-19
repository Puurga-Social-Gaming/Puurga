import express from 'express';
import { TranslationService } from '../services/translationService';
import { supabase } from '../config/supabase';

import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';

const router = express.Router();

router.post('/', auth, async (req: AuthRequest, res) => {
    try {
        const { sourceType, sourceId, targetLanguage } = req.body;

        if (!sourceType || !sourceId || !targetLanguage) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // 1. Fetch original content
        let content = '';
        let table = '';

        switch (sourceType) {
            case 'post':
                table = 'posts';
                break;
            case 'comment':
                table = 'comments';
                break;
            case 'message':
                table = 'messages';
                break;
            case 'notification':
                table = 'notifications';
                break;
            default:
                return res.status(400).json({ error: 'Invalid source type' });
        }

        // Determine query - handles both 'users' and 'profiles' ambiguity if needed, 
        // but here we just need content from content tables
        const { data, error } = await supabase
            .from(table)
            .select('content, language') // Assuming 'content' column exists. Notifications might have 'content' or body.
            .eq('id', sourceId)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Content not found' });
        }

        content = data.content;
        const originalLanguage = data.language || 'en';

        // 2. Optimization: If target same as original, return original
        if (originalLanguage === targetLanguage) {
            return res.json({ translatedText: content });
        }

        // 3. Translate
        const translatedText = await TranslationService.translateContent(
            sourceType,
            sourceId,
            content,
            targetLanguage
        );

        res.json({ translatedText });

    } catch (error) {
        console.error('Translation endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
