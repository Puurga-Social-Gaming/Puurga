---
name: puurga-changelog
description: Post a changelog entry to the Purga app whenever a change, fix, or feature is completed. Use whenever code changes are delivered to the user (bug fixes, new features, UI changes, improvements) so users get notified. WHEN: finishing any change to the Purga app, "post changelog", "announce change", "notify users of update".
---

# Purga Changelog Notifications

Every completed change to the Purga app must be announced to users as a
changelog notification. The notification stays in each user's notification
list until they click it; clicking deletes it and navigates them to the
page where the change was made so they can test it.

## When to post

After completing ANY user-visible change:
- Bug fixes ("Fixed …")
- New features ("Added …")
- Behavior/design changes ("Changed …")
- Polish/performance work ("Improved …")

Skip changelog entries for pure internals with zero user-visible effect
(e.g. refactors that change no behavior, doc-only edits, temp test scripts).

## How to post

Run from the `backend/` directory:

```
npm run changelog -- --title "Fixed chat sending" --message "Messages now deliver again in group chats." --kind fixed --route /messages
```

Flags:
- `--title` (required, short headline)
- `--message` (what changed, in plain user language)
- `--kind` one of `added` | `fixed` | `changed` | `improved` (default `changed`)
- `--route` in-app path the user lands on when clicking (e.g. `/messages`,
  `/settings`, `/profile`). Omit only if the change is global.
- `--version` optional version label
- `--dry-run` validate without posting

The script writes to the local PostgreSQL `changelog_entries` table and
inserts a `changelog` notification for every user (real-time push for
online users). If the backend is not running locally or the DB is
unreachable, post the entry later or tell the user the exact command.

## Rules

- One entry per logical change; combine tiny related tweaks into one entry.
- Write for end users, not developers — no file names or code jargon.
- `--route` must be a real frontend route (see `src/App.tsx`).
- Do not invent version numbers unless the user provides one.

## Related code

- Service: `backend/services/changelogService.ts`
- CLI: `backend/scripts/addChangelog.ts`
- Admin API: `POST /api/admin/changelog` (superadmin), history `GET /api/changelog`
- Frontend card: `src/pages/Notifications/Notifications.tsx` (changelog branch)
- History page: `src/pages/WhatsNew/WhatsNew.tsx` (route `/whats-new`)
