// Re-export the single canonical API instance so all imports from this path
// share the same Supabase-aware token cache defined in src/lib/axios.ts.
// Do NOT create a second axios instance here — that would split the token cache.
export { default } from '../lib/axios';
