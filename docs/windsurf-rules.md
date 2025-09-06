# Windsurf Rules for Puurga

These guardrails are designed to prevent breakage while we rebuild the updated experience.

## Safety & Approvals
- Do not modify any `.env*` files.
- Ask for approval before:
  - Creating/deleting pages or backend routes
  - Changing API contracts or DB schema/migrations
  - Changing Supabase RLS/policies or table structure
- Allowed without prior approval: internal refactors, styles, docs, tests, and non‑breaking component‑level UI changes.

## Project Structure
- Root `Puurga/` is the app root.
- Frontend lives under `src/` with feature folders:
  - `src/components/`, `src/pages/`, `src/context/`, `src/hooks/`, `src/types/`, `src/lib/`, `src/styles/`
- Backend in `backend/` with routes, middleware, config, and migrations.

## Notifications
- Source of truth: Supabase table `notifications`.
- Realtime: use Supabase Realtime (`postgres_changes`) filtered by `receiver_id`.
- Frontend surface: `NotificationContext`, `NotificationBadge`, `NotificationPanel`, `pages/Notifications`.
- Backend surface: `backend/routes/notifications.ts` (list, unread count, mark-as-read).
- Supported types (initial): `friend_request | post_like | post_comment | comment_like`. Extend only after approval.

## Theme & Tokens
- Brand accent: `--accent: #f97316` (Tailwind orange-500).
- CSS variables live in `src/styles/theme.css`.
- Tailwind dark mode: `darkMode: 'class'` in `tailwind.config.js`.
- Theme state is provided by `ThemeProvider` (`src/context/ThemeContext.tsx`), persisted to localStorage, with system fallback.
- Do not hardcode hex for brand; reference tokens or Tailwind classes.

## UI & Components
- Prefer shared primitives under `src/components/ui/` (Button, Input, Card, Modal, Badge, etc.).
- Rounded modern look: medium radius, soft shadows, consistent spacing (8px scale) and typography.
- Use `tailwind-merge` to safely compose classNames.

## Code Style & Quality
- TypeScript + ESM. React 18 function components and hooks.
- Keep logic typed; no `any` where avoidable.
- Lint locally before committing: `npm run lint`.

## Testing & QA
- For each change, add a brief test plan in PR description.
- Run smoke checks for: login, navigation, notifications realtime, theme toggle, and critical forms.

## Incremental Delivery & Flags
- Ship larger layout/UI changes behind a feature flag.
- Break work into small PRs: theme infra → UI primitives → notifications UX polish → layout.

## Backwards Compatibility
- Do not remove or rename public components/routes without a migration path.
- Avoid breaking prop or API changes; add overloads or adapters where possible.
