/**
 * Client-side language detection from browser locale + timezone.
 * No IP geolocation — privacy-safe, allowlisted codes only.
 * User choice in localStorage always wins (handled by i18next order).
 */

export const SUPPORTED_LANGUAGES = [
  'en',
  'fr',
  'zu',
  'ss',
  'es',
  'pt',
  'sw',
  'zh',
  'ar',
  'hi',
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** Country → preferred app language when region is known */
const COUNTRY_TO_LANGUAGE: Record<string, SupportedLanguage> = {
  // Francophone
  FR: 'fr',
  BE: 'fr',
  LU: 'fr',
  MC: 'fr',
  SN: 'fr',
  CI: 'fr',
  ML: 'fr',
  BF: 'fr',
  NE: 'fr',
  TD: 'fr',
  GN: 'fr',
  BJ: 'fr',
  TG: 'fr',
  CF: 'fr',
  CG: 'fr',
  GA: 'fr',
  CM: 'fr',
  DJ: 'fr',
  KM: 'fr',
  MG: 'fr',
  HT: 'fr',
  GP: 'fr',
  MQ: 'fr',
  RE: 'fr',
  YT: 'fr',
  NC: 'fr',
  PF: 'fr',
  WF: 'fr',
  BL: 'fr',
  MF: 'fr',
  PM: 'fr',
  // Swahili-speaking regions
  TZ: 'sw',
  KE: 'sw',
  UG: 'sw',
  RW: 'sw',
  BI: 'sw',
  // Anglophone (explicit so country wins over ambiguous browser tags)
  US: 'en',
  GB: 'en',
  AU: 'en',
  NZ: 'en',
  IE: 'en',
  ZA: 'en',
  NG: 'en',
  GH: 'en',
  JM: 'en',
  TT: 'en',
  BB: 'en',
  BZ: 'en',
  GY: 'en',
  BW: 'en',
  ZM: 'en',
  ZW: 'en',
  MW: 'en',
  SL: 'en',
  LR: 'en',
  // Other supported languages by country
  ES: 'es',
  MX: 'es',
  AR: 'es',
  CO: 'es',
  CL: 'es',
  PE: 'es',
  VE: 'es',
  EC: 'es',
  GT: 'es',
  CU: 'es',
  BO: 'es',
  DO: 'es',
  HN: 'es',
  PY: 'es',
  SV: 'es',
  NI: 'es',
  CR: 'es',
  PA: 'es',
  UY: 'es',
  PT: 'pt',
  BR: 'pt',
  AO: 'pt',
  MZ: 'pt',
  CV: 'pt',
  GW: 'pt',
  ST: 'pt',
  CN: 'zh',
  TW: 'zh',
  HK: 'zh',
  SG: 'zh',
  SA: 'ar',
  AE: 'ar',
  EG: 'ar',
  MA: 'ar',
  DZ: 'ar',
  TN: 'ar',
  JO: 'ar',
  LB: 'ar',
  IQ: 'ar',
  KW: 'ar',
  QA: 'ar',
  BH: 'ar',
  OM: 'ar',
  YE: 'ar',
  LY: 'ar',
  SD: 'ar',
  IN: 'hi',
  // Canada / Switzerland: prefer navigator language (not forced here)
};

/** Timezone → country hint when locale has no region */
const TIMEZONE_TO_COUNTRY: Record<string, string> = {
  'Europe/Paris': 'FR',
  'Europe/Brussels': 'BE',
  'Europe/Luxembourg': 'LU',
  'Indian/Reunion': 'RE',
  'Indian/Mayotte': 'YT',
  'America/Martinique': 'MQ',
  'America/Guadeloupe': 'GP',
  'America/Port-au-Prince': 'HT',
  'Africa/Dakar': 'SN',
  'Africa/Abidjan': 'CI',
  'Africa/Bamako': 'ML',
  'Africa/Ouagadougou': 'BF',
  'Africa/Niamey': 'NE',
  'Africa/Ndjamena': 'TD',
  'Africa/Conakry': 'GN',
  'Africa/Porto-Novo': 'BJ',
  'Africa/Lome': 'TG',
  'Africa/Bangui': 'CF',
  'Africa/Brazzaville': 'CG',
  'Africa/Libreville': 'GA',
  'Africa/Douala': 'CM',
  'Africa/Djibouti': 'DJ',
  'Indian/Comoro': 'KM',
  'Indian/Antananarivo': 'MG',
  'Africa/Dar_es_Salaam': 'TZ',
  'Africa/Nairobi': 'KE',
  'Africa/Kampala': 'UG',
  'Africa/Kigali': 'RW',
  'Africa/Bujumbura': 'BI',
  'Africa/Kinshasa': 'CD',
  'Africa/Lubumbashi': 'CD',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'Europe/London': 'GB',
  'Australia/Sydney': 'AU',
  'Pacific/Auckland': 'NZ',
  'Africa/Johannesburg': 'ZA',
  'Africa/Lagos': 'NG',
  'Africa/Accra': 'GH',
  'America/Toronto': 'CA',
  'America/Montreal': 'CA',
  'Europe/Zurich': 'CH',
  'Asia/Shanghai': 'CN',
  'Asia/Hong_Kong': 'HK',
  'Asia/Taipei': 'TW',
  'Asia/Kolkata': 'IN',
  'Asia/Riyadh': 'SA',
  'Africa/Cairo': 'EG',
  'Africa/Casablanca': 'MA',
  'America/Sao_Paulo': 'BR',
  'Europe/Lisbon': 'PT',
  'Europe/Madrid': 'ES',
  'America/Mexico_City': 'MX',
};

// DRC: French is official + widely used for UI
COUNTRY_TO_LANGUAGE.CD = 'fr';

function isSupportedLanguage(code: string): code is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(code);
}

function sanitizeCountry(code: string | undefined | null): string | null {
  if (!code) return null;
  const upper = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return null;
  return upper;
}

function parseLocaleTag(tag: string): { language: string; region: string | null } {
  try {
    const locale = new Intl.Locale(tag);
    const language = (locale.language || '').toLowerCase();
    const region = sanitizeCountry(locale.region || undefined);
    return { language, region };
  } catch {
    const parts = tag.replace('_', '-').split('-');
    const language = (parts[0] || '').toLowerCase();
    const region = sanitizeCountry(parts[1] || null);
    return { language, region };
  }
}

function getBrowserLocaleTags(): string[] {
  const tags: string[] = [];
  if (typeof navigator !== 'undefined') {
    if (Array.isArray(navigator.languages)) tags.push(...navigator.languages);
    if (navigator.language) tags.push(navigator.language);
  }
  return tags.filter(Boolean);
}

function getTimezoneCountry(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz || typeof tz !== 'string') return null;
    return sanitizeCountry(TIMEZONE_TO_COUNTRY[tz] || null);
  } catch {
    return null;
  }
}

/**
 * Detect the best supported language for a first-time visitor.
 * Priority: country from locale region → country from timezone → browser language → en
 */
export function detectLocaleLanguage(): SupportedLanguage {
  const tags = getBrowserLocaleTags();
  const tzCountry = getTimezoneCountry();

  // 1) Explicit region in browser locales (e.g. fr-FR, sw-TZ, en-TZ)
  for (const tag of tags) {
    const { region } = parseLocaleTag(tag);
    if (region && COUNTRY_TO_LANGUAGE[region]) {
      return COUNTRY_TO_LANGUAGE[region];
    }
  }

  // 2) Timezone country hint (e.g. Tanzania with en-US browser → sw)
  if (tzCountry && COUNTRY_TO_LANGUAGE[tzCountry]) {
    // Canada / Switzerland: respect browser language if supported
    if (tzCountry === 'CA' || tzCountry === 'CH') {
      for (const tag of tags) {
        const { language } = parseLocaleTag(tag);
        if (isSupportedLanguage(language)) return language;
      }
    } else {
      return COUNTRY_TO_LANGUAGE[tzCountry];
    }
  }

  // 3) Primary browser language if we support it
  for (const tag of tags) {
    const { language } = parseLocaleTag(tag);
    // zh-Hans / zh-CN → zh
    if (language === 'zh' || language.startsWith('zh')) return 'zh';
    if (isSupportedLanguage(language)) return language;
  }

  return 'en';
}
