# Localization System Implementation

## Overview
A full-stack localization and translation system has been implemented supporting English (en), French (fr), Zulu (zu), and Siswati (ss).

## Components

### 1. Database
- **SQL Migration**: `backend/migrations/20260120_localization.sql`
  - Adds `language` column to `profiles`, `posts`, `comments`, `messages`, `notifications`.
  - Creates `translations` table for caching AI translations.
  - **Action Required**: Run this SQL in your Supabase SQL Editor.

### 2. Backend API
- **Translation Service**: `backend/services/translationService.ts`
  - Uses OpenAI for translation (gpt-4o-mini).
  - Caches results in Supabase `translations` table.
  - Falls back to mock translation if `OPENAI_API_KEY` is missing.
- **Endpoint**: `POST /api/translate`
  - Accepts: `{ sourceType, sourceId, targetLanguage }`
  - Returns: `{ translatedText }`

### 3. Frontend
- **i18n Setup**: `src/i18n/index.ts` with JSON locales in `src/i18n/locales/`.
- **Language Selector**: 
  - `src/components/LanguageSelector.tsx`
  - Added to Right Sidebar for quick access.
  - Integrated into Settings page.
- **Auto-Translation**:
  - `src/components/ContentTranslator.tsx`: Automatically translates content if user language differs from content language.
  - Integrated into `PostCard.tsx`.

## Configuration
- **Supabase**: Ensure tables exist (`profiles` vs `users`). The SQL script handles `profiles`.
- **OpenAI**: Add `OPENAI_API_KEY` to `backend/.env` for real translations.

## Usage
1. Change language using the selector in the Right Sidebar or Settings.
2. Posts in a different language will automatically attempt to translate.
3. Toggle between "View original" and "View translated" on posts.
