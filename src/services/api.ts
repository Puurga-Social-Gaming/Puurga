// Re-export the single canonical API instance so all imports from this path
// share the same Supabase-aware token cache defined in src/lib/axios.ts.
export { default } from '../lib/axios';