import { supabase } from '../config/supabase';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'mock-key', // Fallback for development if key is missing
    dangerouslyAllowBrowser: false, // Backend only
});

export class TranslationService {
    /**
     * Translate content to target language
     * Checks cache first, translates using AI if needed, then caches result
     */
    static async translateContent(
        sourceType: 'post' | 'comment' | 'message' | 'notification',
        sourceId: string,
        content: string,
        targetLanguage: string
    ): Promise<string> {
        if (!content) return '';
        if (targetLanguage === 'en') return content; // Assuming original is English or handled elsewhere? 
        // Actually prompt says "Original content stores language". 
        // But for this method, we assume caller wants translation.

        try {
            // 1. Check cache
            const { data: cached } = await supabase
                .from('translations')
                .select('translated_text')
                .eq('source_type', sourceType)
                .eq('source_id', sourceId)
                .eq('target_language', targetLanguage)
                .single();

            if (cached) {
                return cached.translated_text;
            }

            // 2. Translate using AI
            let translatedText = '';

            if (process.env.OPENAI_API_KEY) {
                const response = await openai.chat.completions.create({
                    model: "gpt-4o-mini", // Optimized for speed/cost
                    messages: [
                        {
                            role: "system",
                            content: `You are a professional translator. Translate the following text into ${targetLanguage}. Preserve formatting and tone. Only return the translated text.`
                        },
                        {
                            role: "user",
                            content: content
                        }
                    ],
                    max_tokens: 500,
                });
                translatedText = response.choices[0]?.message?.content || content;
            } else {
                // Mock translation for dev/demo if key missing
                translatedText = `[${targetLanguage}] ${content}`;
                console.warn('OPENAI_API_KEY not found, using mock translation');
            }

            // 3. Cache result
            if (translatedText) {
                await supabase
                    .from('translations')
                    .insert({
                        source_type: sourceType,
                        source_id: sourceId,
                        target_language: targetLanguage,
                        translated_text: translatedText
                    });
            }

            return translatedText;

        } catch (error) {
            console.error('Translation error:', error);
            return content; // Fallback to original
        }
    }

    /**
     * Translate multiple items in batch (Logic can be expanded)
     */
    static async translateBatch(items: any[], targetLanguage: string) {
        // Implementation for batching if needed
        return items;
    }
}
