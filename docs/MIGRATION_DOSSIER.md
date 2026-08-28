# Puurga — Complete Supabase → Self-Hosted PostgreSQL Migration Dossier

**Status:** Phase 1 Reconnaissance Complete — READ-ONLY AUDIT  
**Date:** 2026-08-25  
**Zero Unintended Data Loss**

---

## TABLE OF CONTENTS

1. [Database Overview](#1-database-overview)
2. [Complete Table Inventory](#2-complete-table-inventory)
3. [Relationship Map](#3-relationship-map)
4. [Database Objects](#4-database-objects)
5. [Supabase Dependencies](#5-supabase-dependencies)
6. [Data Integrity](#6-data-integrity)
7. [Authentication](#7-authentication)
8. [Storage](#8-storage)
9. [Realtime](#9-realtime)
10. [Recommended Import Order](#10-recommended-import-order)
11. [Migration Risks](#11-migration-risks)
12. [Data That MUST NOT Be Lost](#12-data-that-must-not-be-lost)
13. [Export Plan](#13-export-plan)
14. [Verification Plan](#14-verification-plan)

---

## 1. DATABASE OVERVIEW

### 1.1 Architecture Summary

| Component | Current State | Target State |
|-----------|---------------|--------------|
| Frontend | React + Vite + TypeScript | No change |
| Backend | Node.js + Express + TypeScript | No change |
| Database | Supabase-managed PostgreSQL | Self-hosted PostgreSQL |
| Auth | Supabase Auth | Custom JWT (existing middleware) |
| Storage | Supabase Storage | Self-hosted (local/S3) |
| Realtime | Supabase Realtime | Custom WebSocket (already exists) |

### 1.2 Database Statistics

| Metric | Value |
|--------|-------|
| Total SQL Files | 66 (42 timestamped + 22 named + 4 root-level) |
| Total CREATE TABLE Statements | ~55 unique tables |
| Total CREATE FUNCTION Statements | 14 |
| Total CREATE TRIGGER Statements | 9 |
| Total ALTER TABLE Statements | ~80+ column additions |
| Total CREATE INDEX Statements | 124+ |
| Total CREATE TYPE (enum) Statements | 3 |
| Total RLS Policies | ~47 |
| Tables with RLS Enabled | 16 |
| Tables with FK to auth.users | 5 |

### 1.3 Schemas

| Schema | Purpose | Migration Impact |
|--------|---------|------------------|
| `public` | Application tables | MIGRATE |
| `auth` | Supabase Auth infrastructure | REPLACE (custom auth) |
| `storage` | Supabase Storage infrastructure | REPLACE (local/S3) |
| `realtime` | Supabase Realtime infrastructure | REPLACE (WebSocket) |
| `extensions` | PostgreSQL extensions | REVIEW (pg_trgm, uuid-ossp, etc.) |

---

## 2. COMPLETE TABLE INVENTORY

### 2.1 Core Tables (Created by Supabase/Sequelize, not in migrations)

These tables are referenced by foreign keys but their CREATE TABLE is NOT in any migration file — they exist from the original Supabase/Sequelize schema:

| Table | Purpose | Migration Impact |
|-------|---------|------------------|
| `profiles` | Central user table — FK target for nearly everything | MIGRATE (critical) |
| `users` | Legacy auth users table | MIGRATE (legacy) |
| `posts` | User posts — referenced everywhere | MIGRATE (critical) |
| `comments` | Post comments with threading | MIGRATE |
| `likes` | Post likes | MIGRATE |
| `notifications` | User notifications | MIGRATE |
| `images` | Post images | MIGRATE |

### 2.2 Tables Created by Migrations (55 tables)

#### Friend/Social Graph
| Table | Key Columns | FK Targets |
|-------|-------------|------------|
| `friend_requests` | id, sender_id, receiver_id, status | profiles |
| `friends` | id, user_id, friend_id | profiles |
| `followers` | id, follower_id, following_id | profiles |
| `user_blocks` | id, blocker_id, blocked_id | profiles |
| `user_mutes` | id, muter_id, muted_id | profiles |

#### Messaging
| Table | Key Columns | FK Targets |
|-------|-------------|------------|
| `conversations` | id, created_at, updated_at | — |
| `conversation_participants` | id, conversation_id, user_id | conversations, profiles |
| `messages` | id, conversation_id, from_user_id, content, images, is_edited, is_deleted, read, read_at, deleted_by, deleted_scope, language | conversations, profiles |
| `message_reactions` | id, message_id, user_id, emoji | messages, profiles |
| `message_trash` | id, message_id, user_id, conversation_id, content_snapshot, images_snapshot, scope | messages, profiles, conversations |
| `call_invites` | id, caller_id, callee_id, conversation_id, call_type, room_id, status | — |

#### Groups
| Table | Key Columns | FK Targets |
|-------|-------------|------------|
| `groups` | id, name, description, is_private, created_by, credits, invite_code | profiles |
| `group_members` | id, group_id, user_id, role, muted | groups, profiles |
| `group_messages` | id, group_id, sender_id, content, images, is_edited, is_deleted, language | groups, profiles |
| `group_message_reads` | id, message_id, user_id | group_messages, profiles |
| `group_message_reactions` | id, message_id, user_id, emoji | group_messages, profiles |

#### Posts/Purges
| Table | Key Columns | FK Targets |
|-------|-------------|------------|
| `post_purges` | id, post_id, user_id | posts, profiles |
| `shares` | id, post_id, user_id | posts, users |

#### Statuses/Stories
| Table | Key Columns | FK Targets |
|-------|-------------|------------|
| `statuses` | id, user_id, content, media_url, type, gradient_index, expires_at, view_count | auth.users |
| `story_views` | id, story_id, viewer_id | statuses, auth.users |

#### Credits & Economy
| Table | Key Columns | FK Targets |
|-------|-------------|------------|
| `credit_transactions` | id, user_id, amount NUMERIC(12,2), type, source | profiles |
| `credit_transfers` | id, from_user_id, to_user_id, amount | profiles |
| `credit_packages` | id, slug, title, cost, reward_label | — |
| `redemption_activities` | id, ghost_user_id, helper_user_id, activity_type, points_earned | profiles |
| `redemption_requests` | id, user_id, supporter_id, status | profiles |
| `redemptions` | id, redeemer_id, redeemed_user_id, credits_spent | profiles |

#### Survival System
| Table | Key Columns | FK Targets |
|-------|-------------|------------|
| `user_survival_state` | id, user_id (UNIQUE), reputation_score, survival_score, threat_level, purge_count, survived_purges, ghost_status, social_rank, purgatory_status, redemption_progress, alliance_count | profiles |
| `survival_events` | id, user_id, event_type, event_value, metadata | profiles |
| `survival_history` | id, user_id, reputation_score, survival_score, threat_level, purge_count, survival_state | profiles |
| `purge_cooldowns` | id, user_id, post_id, purged_at, expires_at | profiles, posts |
| `user_alliances` | id, requester_id, target_id, alliance_status, loyalty_score | users |
| `alliance_support_actions` | id, alliance_id, supporter_id, support_type, support_value | user_alliances |
| `alliance_cooldowns` | id, user_id, cooldown_type, expires_at | — |

#### Gaming System
| Table | Key Columns | FK Targets |
|-------|-------------|------------|
| `game_seasons` | id, name, starts_at, ends_at, is_active | — |
| `game_presence` | user_id (PK), game_id, game_title, last_heartbeat | profiles |
| `game_challenges` | id, challenger_id, opponent_id, game_id, stake, status, match_type, tournament_id, season_id, winner_id, replay_url, expires_at | profiles |
| `game_sessions` | id, game_id, challenge_id, status, server_seed, client_seed, winner_id, loser_id, ended_reason | — |
| `game_challenge_results` | id, challenge_id (UNIQUE), session_id, winner_id, loser_id, stake, validated, validation_source | game_challenges |
| `game_rankings` | user_id + season_id (composite PK), wins, losses, elo_rating, best_streak | profiles, game_seasons |
| `game_match_history` | id, user_id, opponent_id, game_id, result, stake, points_delta, elo_before, elo_after | — |
| `game_purge_events` | id, user_id, challenge_id, reason, balance_at_event, processed | — |
| `game_audit_logs` | id, actor_id, challenge_id, session_id, action, metadata | — |
| `game_notifications` | id, user_id, type, title, body, challenge_id, read | — |
| `matchmaking_queue` | id, user_id, game_id, elo | — |
| `matches` | id, game_id, player1_id, player2_id, status | — |
| `tournaments` | id, title, game_id, status, max_players, prize_credits | — |
| `tournament_participants` | id, tournament_id, user_id, seed | tournaments, users |

#### Notifications & Security
| Table | Key Columns | FK Targets |
|-------|-------------|------------|
| `push_subscriptions` | id, user_id, endpoint, p256dh, auth | users |
| `security_events` | id, event_type, user_id, ip_address, user_agent, url | auth.users |
| `superadmin_audit_logs` | id, superadmin_id, action, target_id, target_type, details, ip_address | profiles |
| `system_error_logs` | id, level, message, stack, path, method, user_id, metadata | profiles |

#### Settings
| Table | Key Columns | FK Targets |
|-------|-------------|------------|
| `user_settings` | id, user_id (UNIQUE), settings JSONB | profiles |
| `global_settings` | id (CHECK id=1 singleton), settings JSONB | — |

#### Localization
| Table | Key Columns | FK Targets |
|-------|-------------|------------|
| `translations` | id, source_type, source_id, target_language, translated_text | — |

#### Comments
| Table | Key Columns | FK Targets |
|-------|-------------|------------|
| `comment_likes` | id, comment_id, user_id | comments, profiles |

#### Certifications
| Table | Key Columns | FK Targets |
|-------|-------------|------------|
| `certification_pricing` | slug (PK), price_points, price_cdf, price_usd, enabled | — |
| `certification_requests` | id, user_id, certification_slug, status, paid, payment_method, payment_network, payment_phone, amount_cdf, amount_usd, currency, payment_reference, payment_status, reviewed_by | profiles |
| `certifications` | user_id, certification_slug, certified_at, certified_by | profiles |

#### E2E Encryption
| Table | Key Columns | FK Targets |
|-------|-------------|------------|
| `user_crypto_keys` | user_id (PK), public_key, updated_at | profiles |

#### Analytics & XP
| Table | Key Columns | FK Targets |
|-------|-------------|------------|
| `analytics_events` | id, user_id, event, metadata | profiles |
| `xp_transactions` | id, user_id, amount, source, total_xp | profiles |
| `achievements` | id (TEXT PK), name, description, icon, category, xp_reward | — |
| `user_achievements` | id, user_id, achievement_id | profiles, achievements |
| `daily_missions` | id, user_id, date, mission_type, target, progress, xp_reward, completed, claimed | profiles |

#### Other
| Table | Key Columns | FK Targets |
|-------|-------------|------------|
| `SequelizeMeta` | name (VARCHAR, PK) | — |
| `post_backgrounds` | (referenced in code, not in migrations) | — |

---

## 3. RELATIONSHIP MAP

### 3.1 Core Relationships

```
auth.users (Supabase Auth)
  ├── profiles.id (1:1)
  │   ├── posts.user_id (1:N)
  │   │   ├── comments.post_id (1:N)
  │   │   │   └── comment_likes.comment_id (1:N)
  │   │   ├── likes.post_id (1:N)
  │   │   ├── post_purges.post_id (1:N)
  │   │   └── shares.post_id (1:N)
  │   ├── friends.user_id / friend_id (M:N via junction)
  │   ├── friend_requests.sender_id / receiver_id (M:N via junction)
  │   ├── followers.follower_id / following_id (M:N via junction)
  │   ├── messages.from_user_id (1:N)
  │   │   └── message_reactions.message_id (1:N)
  │   ├── conversation_participants.user_id (M:N via junction)
  │   ├── group_members.user_id (M:N via junction)
  │   │   └── group_messages.sender_id (1:N)
  │   │       └── group_message_reactions.message_id (1:N)
  │   │       └── group_message_reads.message_id (1:N)
  │   ├── notifications.receiver_id (1:N)
  │   ├── credit_transactions.user_id (1:N)
  │   ├── credit_transfers.from_user_id / to_user_id (M:N via junction)
  │   ├── user_survival_state.user_id (1:1)
  │   │   ├── survival_events.user_id (1:N)
  │   │   └── survival_history.user_id (1:N)
  │   ├── game_challenges.challenger_id / opponent_id (M:N via junction)
  │   │   └── game_challenge_results.challenge_id (1:1)
  │   ├── game_sessions (1:N)
  │   ├── game_rankings.user_id (1:N per season)
  │   ├── game_match_history.user_id (1:N)
  │   ├── user_alliances.requester_id / target_id (M:N via junction)
  │   │   └── alliance_support_actions.alliance_id (1:N)
  │   ├── user_settings.user_id (1:1)
  │   ├── user_crypto_keys.user_id (1:1)
  │   ├── user_achievements.user_id (M:N via junction)
  │   ├── daily_missions.user_id (1:N)
  │   ├── xp_transactions.user_id (1:N)
  │   ├── analytics_events.user_id (1:N)
  │   ├── user_blocks.blocker_id / blocked_id (M:N via junction)
  │   ├── user_mutes.muter_id / muted_id (M:N via junction)
  │   ├── statuses.user_id (1:N)
  │   │   └── story_views.story_id (1:N)
  │   ├── security_events.user_id (1:N)
  │   ├── superadmin_audit_logs.superadmin_id (1:N)
  │   ├── system_error_logs.user_id (1:N)
  │   ├── push_subscriptions.user_id (1:N)
  │   ├── certification_requests.user_id (1:N)
  │   ├── redemptions.redeemer_id / redeemed_user_id (M:N via junction)
  │   ├── redemption_requests.user_id / supporter_id (M:N via junction)
  │   ├── redemption_activities.ghost_user_id / helper_user_id (M:N via junction)
  │   ├── purge_cooldowns.user_id (1:N)
  │   ├── game_purge_events.user_id (1:N)
  │   ├── game_audit_logs.actor_id (1:N)
  │   ├── game_notifications.user_id (1:N)
  │   ├── game_presence.user_id (1:1)
  │   ├── groups.created_by (1:N)
  │   │   └── group_members.group_id (M:N via junction)
  │   │       └── group_messages.group_id (1:N)
  │   ├── call_invites.caller_id / callee_id (M:N via junction)
  │   └── translations (polymorphic: source_type + source_id)
  └── users.id (legacy, 1:1 with profiles)
```

### 3.2 Self-Referencing Relationships

| Table | Column | References | Purpose |
|-------|--------|------------|---------|
| `comments` | `parent_id` | `comments.id` | Threaded comments |
| `user_alliances` | `requester_id` / `target_id` | `users.id` | Mutual alliances |
| `credit_transfers` | `from_user_id` / `to_user_id` | `profiles.id` | Peer-to-peer transfers |
| `redemptions` | `redeemer_id` / `redeemed_user_id` | `profiles.id` | Redemption relationships |
| `game_challenges` | `challenger_id` / `opponent_id` | `profiles.id` | Game challenges |

### 3.3 Circular Dependencies

| Cycle | Tables | Risk |
|-------|--------|------|
| profiles ↔ post_purges | profiles → post_purges (user_id), post_purges → posts → profiles (user_id) | LOW — different FK targets |
| profiles ↔ game_challenges | profiles → game_challenges (challenger_id/opponent_id), game_challenges → profiles (winner_id) | LOW — different FK targets |

---

## 4. DATABASE OBJECTS

### 4.1 Functions (14 total)

| Function | Purpose | Tables Modified | Supabase-Specific | Must Recreate |
|----------|---------|-----------------|-------------------|---------------|
| `get_user_relations(p_user_id UUID)` | Returns related user IDs (friends + pending requests) | — (READ ONLY) | NO | YES |
| `get_friend_suggestions(p_user_id UUID, p_limit INT)` | Returns random non-friend profiles | — (READ ONLY) | NO | YES |
| `update_post_purge_count()` | Trigger fn: updates posts.purge_count | post_purges → posts | NO | YES |
| `notify_super_admins_of_security_event()` | Trigger fn: inserts notification for all super admins | security_events → notifications | NO | YES |
| `sync_profile_post_count()` | Trigger fn: increments/decrements profiles.posts_count | posts → profiles | NO | YES |
| `sync_profile_purge_count()` | Trigger fn: manages purge streak + credit bonuses | post_purges → profiles | NO | YES |
| `update_survival_state_updated_at()` | Trigger fn: auto-sets updated_at | user_survival_state | NO | YES |
| `create_initial_survival_state()` | Trigger fn: creates survival state on profile insert | profiles → user_survival_state | NO | YES |
| `update_conversation_timestamp()` | Trigger fn: updates conversations.updated_at | messages → conversations | NO | YES |
| `update_group_timestamp()` | Trigger fn: updates groups.updated_at | group_messages → groups | NO | YES |
| `update_call_invite_timestamp()` | Trigger fn: updates call_invites.updated_at | call_invites | NO | YES |
| `update_credit_balance(p_user_id, p_amount, p_source, p_description)` | Atomic credit update with audit trail | credit_transactions, profiles | NO | YES |
| `rpc_update_credit_balance(p_amount, p_source, p_description)` | RPC wrapper using auth.uid() | credit_transactions, profiles | **YES** — uses auth.uid() | REWRITE |
| `list_objects(bucketid, prefix, limits, offsets)` | Optimized storage.objects listing | storage.objects | **YES** — Supabase storage | REPLACE |

### 4.2 Triggers (9 total)

| Trigger | Table | Event | Function | Purpose |
|---------|-------|-------|----------|---------|
| `trigger_update_post_purge_count` | post_purges | AFTER INSERT OR DELETE | update_post_purge_count() | Sync purge counts |
| `trigger_notify_super_admins_security` | security_events | AFTER INSERT | notify_super_admins_of_security_event() | Alert super admins |
| `trigger_sync_profile_post_count` | posts | AFTER INSERT OR DELETE | sync_profile_post_count() | Sync post counts |
| `trigger_sync_profile_purge_count` | post_purges | AFTER INSERT OR DELETE | sync_profile_purge_count() | Sync purge counts |
| `trigger_survival_state_updated_at` | user_survival_state | BEFORE UPDATE | update_survival_state_updated_at() | Timestamp management |
| `trigger_create_survival_state` | profiles | AFTER INSERT | create_initial_survival_state() | Auto-create survival state |
| `update_conversation_on_message` | messages | AFTER INSERT | update_conversation_timestamp() | Timestamp management |
| `update_group_on_message` | group_messages | AFTER INSERT | update_group_timestamp() | Timestamp management |
| `update_call_invite_on_change` | call_invites | BEFORE UPDATE | update_call_invite_timestamp() | Timestamp management |

### 4.3 Enums (3 total)

| Enum Type | Values | Migration Impact |
|-----------|--------|------------------|
| `message_requests_enum` | 'everyone', 'followers', 'none' | REPLACE with CHECK constraint |
| `privacy_enum` | 'everyone', 'followers', 'none' | REPLACE with CHECK constraint |
| `story_privacy_enum` | 'everyone', 'followers', 'close_friends' | REPLACE with CHECK constraint |

**Note:** Most "enums" are enforced via CHECK constraints on TEXT columns rather than PostgreSQL ENUM types.

### 4.4 Indexes (124+ total)

All indexes are standard PostgreSQL indexes. No Supabase-specific indexes.

---

## 5. SUPABASE DEPENDENCIES

### 5.1 Supabase Auth (CRITICAL)

#### Frontend Auth Usage (13 files, ~30 call sites)

| File | Methods Used |
|------|-------------|
| `src/hooks/useAuth.ts` | `signUp`, `signInWithPassword`, `signOut`, `resetPasswordForEmail`, `updateUser` |
| `src/lib/axios.ts` | `getSession` (token caching), `onAuthStateChange` (token refresh), `signOut` (401 handler) |
| `src/context/UserContext.tsx` | `getSession`, `onAuthStateChange` |
| `src/App.tsx` | `onAuthStateChange` |
| `src/pages/ResetPassword.tsx` | `getSession`, `onAuthStateChange`, `updateUser` |
| `src/pages/Login.tsx` | `onAuthStateChange` |
| `src/pages/ForgotPassword.tsx` | `resetPasswordForEmail` |
| `src/pages/AuthCallback.tsx` | `exchangeCodeForSession`, `getSession` |
| `src/lib/googleAuth.ts` | `signInWithOAuth` |
| `src/components/Sidebar/RightSidebar.tsx` | `signOut` |
| `src/components/Navigation/MobileSideMenu.tsx` | `signOut` |
| `src/components/Navigation/MainNav.tsx` | `signOut` |
| `src/components/DevDetector.tsx` | Reads localStorage token |

**Auth methods required to replace:**
- `signUp`, `signInWithPassword`, `signOut`
- `resetPasswordForEmail`, `updateUser`
- `getSession`, `onAuthStateChange`
- `exchangeCodeForSession`, `signInWithOAuth`

#### Backend Auth Usage

| File | Purpose |
|------|---------|
| `backend/middleware/supabaseAuth.ts` | Core auth middleware — uses `supabase.auth.getUser(token)` + JWT decode fallback |
| `backend/services/userService.ts` | `supabase.auth.signUp` |
| `backend/routes/users.ts` | `supabase.auth.admin.updateUserById` |
| `backend/check_db_data.js` | `supabase.auth.admin.listUsers` |

**Auth admin methods required to replace:**
- `getUser`, `signUp`, `admin.listUsers`, `admin.updateUserById`, `admin.generateLink`, `admin.createUser`

### 5.2 Supabase Storage (MEDIUM)

#### Storage Buckets

| Bucket | Where Created | Where Used |
|--------|-------------|-----------|
| `Media` | Not in migrations (manual) | Frontend: `list`, `getPublicUrl` |
| `stories` | `fix_statuses_and_story_views.sql` | Backend: `remove` |
| `avatars` | Not in migrations | Backend: `upload`, `createSignedUrl` |
| `covers` | Not in migrations | Backend: `upload`, `createSignedUrl` |

#### Storage Operations

| Operation | Files | Purpose |
|-----------|-------|---------|
| `upload` | `backend/routes/users.ts`, `backend/routes/statuses.ts` | File upload |
| `createSignedUrl` | `backend/routes/users.ts` | Generate signed URLs |
| `remove` | `backend/routes/statuses.ts` | File deletion |
| `list` | `src/components/Post/CreatePost.tsx` | List bucket contents |
| `getPublicUrl` | `src/components/Post/CreatePost.tsx` | Get public URLs |
| `listBuckets` | `backend/routes/media.ts` | List all buckets |
| `createBucket` | `backend/routes/media.ts` | Create new bucket |

### 5.3 Supabase Realtime (HIGH)

#### Frontend Realtime Subscriptions

| Channel | Table(s) Monitored | Event Types | File |
|---------|-------------------|-------------|------|
| `notifications` | `notifications` | INSERT (filtered by receiver_id) | `useNotifications.ts` |
| `public:posts` | `posts` | INSERT | `Home.tsx` |
| `profile-status:{id}` | `friend_requests`, `friends` | ALL (filtered) | `UserProfile.tsx` |
| `call_invites` | `call_invites` | INSERT, UPDATE | `CallNotification.tsx` |
| `playing-users` | N/A (Presence) | Presence sync | `purgaService.ts` |

**Note:** The codebase already has a custom WebSocket system (`websocketService`) that handles most realtime needs. Supabase Realtime is used as a fallback in some places.

### 5.4 RLS / Security (HIGH)

#### Tables with RLS Enabled (16 tables)

| Table | Policies | Key Policy Logic |
|-------|----------|------------------|
| `statuses` | 4 | Users can view all active, insert/update/delete own |
| `story_views` | 3 | Users can view own story views, insert own views |
| `security_events` | 4 | Super admins can view, system can insert, no updates/deletes |
| `superadmin_audit_logs` | 3 | Super admins can view, no updates/deletes, system can insert |
| `system_error_logs` | 1 | Super admins can view |
| `friend_requests` | 4 | Users can view own, insert own, update received |
| `friends` | 1 | Users can view their friends |
| `conversations` | 2 | Users can view own conversations, create conversations |
| `conversation_participants` | 2 | Users can view participants in own conversations |
| `messages` | 2 | Users can view/send messages in own conversations |
| `groups` | 5 | Public viewable, members view private, admins manage |
| `group_members` | 5 | Public viewable, members view, admins add/remove |
| `group_messages` | 2 | Members can view/send |
| `user_settings` | 3 | Users can view/insert/update own |
| `global_settings` | 2 | Admins view, super admins manage |
| `call_invites` | 3 | Users can view/create/update own |

**Every RLS policy uses `auth.uid()` to resolve the current Supabase Auth user.** All must be replaced.

### 5.5 Database Functions Using Supabase-Specific Features

| Function | Supabase Dependency | Migration Impact |
|----------|-------------------|------------------|
| `rpc_update_credit_balance` | Uses `auth.uid()` to identify caller | REWRITE to accept user_id parameter |
| `list_objects` | Queries `storage.objects` | REPLACE with local storage listing |
| All trigger functions | No Supabase dependency | MIGRATE as-is |

---

## 6. DATA INTEGRITY

### 6.1 Tables Referenced But Not Created in Migrations

These tables exist in the Supabase database but their CREATE TABLE is NOT in any migration file. They must be exported directly:

| Table | Purpose | Criticality |
|-------|---------|-------------|
| `profiles` | Central user table | CRITICAL |
| `users` | Legacy auth users | HIGH |
| `posts` | User posts | CRITICAL |
| `comments` | Post comments | HIGH |
| `likes` | Post likes | MEDIUM |
| `notifications` | User notifications | HIGH |
| `images` | Post images | MEDIUM |

### 6.2 Potential Data Integrity Issues to Check

| Issue | Tables Affected | Risk |
|-------|----------------|------|
| Orphaned records (FK to non-existent parent) | All child tables | HIGH |
| Broken foreign keys | All FK relationships | HIGH |
| Duplicate primary keys | All tables | HIGH |
| Duplicate unique values | profiles.username, profiles.email | HIGH |
| Required NULL values | Nullable columns with NOT NULL constraints | MEDIUM |
| Invalid references | FK to auth.users vs profiles.id inconsistency | HIGH |
| Missing parent records | All child tables | HIGH |

### 6.3 Economy/Financial Data Integrity

| Check | Tables Affected | Risk |
|-------|----------------|------|
| Negative balances | profiles.credits, profiles.purga_points | HIGH |
| Orphaned transactions | credit_transactions, credit_transfers | HIGH |
| Transactions without users | credit_transactions, credit_transfers | HIGH |
| Invalid transaction types | credit_transactions.type (CHECK constraint) | MEDIUM |
| Duplicate transaction identifiers | credit_transactions.id | HIGH |
| Balance inconsistencies | profiles.credits vs sum(credit_transactions) | HIGH |

---

## 7. AUTHENTICATION

### 7.1 Current Auth Architecture

```
Frontend (Supabase JS Client)
  ↓ signInWithPassword
Supabase Auth (cloud)
  ↓ JWT token
Backend (supabaseAuth.ts middleware)
  ↓ supabase.auth.getUser(token)
  ↓ Falls back to JWT decode using SUPABASE_JWT_SECRET
  ↓ Falls back to profiles table lookup
Express Routes
```

### 7.2 Auth Migration Requirements

| Requirement | Current State | Target State |
|-------------|---------------|--------------|
| User registration | Supabase Auth signUp | Custom auth (JWT + bcrypt) |
| Login | Supabase Auth signInWithPassword | Custom auth |
| Session management | Supabase session persistence | Custom JWT + localStorage |
| Password reset | Supabase Auth resetPasswordForEmail | Custom email flow |
| OAuth (Google) | Supabase Auth signInWithOAuth | Passport.js or custom |
| Token verification | supabase.auth.getUser(token) | JWT verify with secret |
| Admin user management | supabase.auth.admin.* | Direct PostgreSQL + bcrypt |
| Email confirmation | Supabase Auth | Custom email service |

### 7.3 Password Migration Strategy

**Option A: Forced Password Reset (Recommended)**
- Export all user emails from `auth.users`
- Send password reset emails to all users
- Users set new passwords in the self-hosted system
- Pro: Clean break, no password hash migration
- Con: Users must reset passwords

**Option B: Password Hash Migration**
- Export password hashes from `auth.users` (if accessible)
- Import into new auth system
- Pro: Users keep existing passwords
- Con: Hash format may differ (Supabase uses bcrypt)

**Decision:** Requires Supabase dashboard access to check if password hashes are exportable.

### 7.4 Auth Data to Export

| Data | Source | Format |
|------|--------|--------|
| User IDs | `auth.users.id` | UUID |
| Email addresses | `auth.users.email` | TEXT |
| Email confirmed | `auth.users.email_confirmed_at` | TIMESTAMPTZ |
| Phone numbers | `auth.users.phone` | TEXT (if used) |
| Created at | `auth.users.created_at` | TIMESTAMPTZ |
| Last sign in | `auth.users.last_sign_in_at` | TIMESTAMPTZ |
| User metadata | `auth.users.raw_user_meta_data` | JSONB |
| App metadata | `auth.users.raw_app_meta_data` | JSONB |
| Role | `auth.users.role` | TEXT |
| Password hashes | `auth.users.encrypted_password` | TEXT (if exportable) |

---

## 8. STORAGE

### 8.1 Storage Architecture

| Component | Current State | Target State |
|-----------|---------------|--------------|
| File storage | Supabase Storage (S3-compatible) | Local filesystem or S3 |
| Public URLs | Supabase CDN | Nginx static serving or S3 URLs |
| Signed URLs | Supabase Storage signed URLs | Custom signed URL generation |
| Upload handling | Supabase Storage upload | Local filesystem or S3 upload |
| File listing | Supabase Storage list | Local filesystem or S3 list |

### 8.2 Storage Buckets to Migrate

| Bucket | Object Count (est.) | Public Access | Migration Priority |
|--------|-------------------|---------------|-------------------|
| `Media` | Unknown | Public | HIGH |
| `avatars` | Unknown | Signed URLs | HIGH |
| `covers` | Unknown | Signed URLs | HIGH |
| `stories` | Unknown | Signed URLs | MEDIUM |
| `groups` | Unknown | Signed URLs | MEDIUM |

### 8.3 Database Columns Storing Media References

| Table | Column | Reference Type |
|-------|--------|---------------|
| `profiles` | `avatar_url` | Storage URL/path |
| `profiles` | `cover_photo` | Storage URL/path |
| `posts` | `images` | JSONB array of URLs |
| `statuses` | `media_url` | Storage URL/path |
| `messages` | `images` | JSONB array of URLs |
| `group_messages` | `images` | TEXT array of URLs |

---

## 9. REALTIME

### 9.1 Current Realtime Architecture

```
Supabase Realtime (cloud)
  ↓ postgres_changes
Frontend subscriptions
  ↓ WebSocket fallback
Custom WebSocket Server (already exists)
```

### 9.2 Realtime Dependencies

| Subscription | Table | Event | Replacement |
|-------------|-------|-------|-------------|
| `notifications` | notifications | INSERT | WebSocket (already exists) |
| `public:posts` | posts | INSERT | WebSocket (already exists) |
| `profile-status` | friend_requests, friends | ALL | WebSocket (already exists) |
| `call_invites` | call_invites | INSERT, UPDATE | WebSocket (already exists) |
| `playing-users` | N/A (Presence) | Presence | Custom presence system |

### 9.3 Custom WebSocket System (Already Exists)

The codebase already has a custom WebSocket server handling:
- `notification`, `new_message`, `message_edited`, `message_deleted`
- `message_hidden`, `message_reaction`, `message_read`
- `group_message`, `group_message_reaction`, `group_typing`
- `match_found`, `typing`, `user_status_change`
- `credit_update`, `profile_update`, `survival_update`
- `xp_update`, `level_up`, `friend_started_game`, `friend_left_game`
- `challenge_*`

**Migration Impact:** LOW — The custom WebSocket system can replace Supabase Realtime with minimal changes.

---

## 10. RECOMMENDED IMPORT ORDER

### 10.1 Safe Import Order (Dependency-First)

```
1. PostgreSQL Extensions
   ├── uuid-ossp
   ├── pgcrypto
   ├── pg_trgm
   └── (others as needed)

2. Custom Types/Enums
   ├── message_requests_enum
   ├── privacy_enum
   └── story_privacy_enum

3. Core Tables (No FK dependencies)
   ├── profiles (CRITICAL — central table)
   ├── users (legacy)
   ├── posts
   ├── comments
   ├── likes
   ├── notifications
   └── images

4. Social Graph Tables
   ├── friends
   ├── friend_requests
   ├── followers
   ├── user_blocks
   └── user_mutes

5. Messaging Tables
   ├── conversations
   ├── conversation_participants
   ├── messages
   ├── message_reactions
   ├── message_trash
   └── call_invites

6. Group Tables
   ├── groups
   ├── group_members
   ├── group_messages
   ├── group_message_reads
   └── group_message_reactions

7. Status/Stories Tables
   ├── statuses
   └── story_views

8. Economy Tables
   ├── credit_transactions
   ├── credit_transfers
   ├── credit_packages
   ├── redemption_activities
   ├── redemption_requests
   └── redemptions

9. Survival System Tables
   ├── user_survival_state
   ├── survival_events
   ├── survival_history
   ├── purge_cooldowns
   ├── user_alliances
   ├── alliance_support_actions
   └── alliance_cooldowns

10. Gaming System Tables
    ├── game_seasons
    ├── game_presence
    ├── game_challenges
    ├── game_sessions
    ├── game_challenge_results
    ├── game_rankings
    ├── game_match_history
    ├── game_purge_events
    ├── game_audit_logs
    ├── game_notifications
    ├── matchmaking_queue
    ├── matches
    ├── tournaments
    └── tournament_participants

11. Security/Audit Tables
    ├── security_events
    ├── superadmin_audit_logs
    └── system_error_logs

12. Settings Tables
    ├── user_settings
    └── global_settings

13. Certification Tables
    ├── certification_pricing
    ├── certification_requests
    └── certifications

14. Other Tables
    ├── translations
    ├── comment_likes
    ├── user_crypto_keys
    ├── analytics_events
    ├── xp_transactions
    ├── achievements
    ├── user_achievements
    ├── daily_missions
    ├── push_subscriptions
    ├── post_purges
    └── shares

15. Functions and Triggers
    ├── All trigger functions
    ├── All RPC functions
    └── All utility functions

16. Indexes
    └── All indexes (after data import)

17. Data Import (in dependency order)
    └── Import data for each table group above
```

---

## 11. MIGRATION RISKS

### CRITICAL RISKS

| Risk | Impact | Mitigation |
|------|--------|------------|
| Password hash export from Supabase | Users cannot log in | Check Supabase dashboard for hash export; fallback to password reset |
| FK to auth.users inconsistency | Data integrity loss | Map auth.users IDs to profiles IDs before migration |
| RLS policy replacement | Security vulnerabilities | Implement authorization in Express middleware |
| Missing tables (profiles, posts, etc.) | Data loss | Export directly from Supabase database |

### HIGH RISKS

| Risk | Impact | Mitigation |
|------|--------|------------|
| Orphaned records in migration | Data corruption | Run integrity checks before/after migration |
| Storage URL conversion | Broken media references | Map Supabase URLs to new paths before migration |
| Realtime subscription gaps | Missing live updates | Complete WebSocket migration before cutover |
| Economy data inconsistency | Financial loss | Validate balances before/after migration |

### MEDIUM RISKS

| Risk | Impact | Mitigation |
|------|--------|------------|
| Trigger function compatibility | Broken business logic | Test all triggers on target PostgreSQL |
| Index performance differences | Slow queries | Benchmark before/after migration |
| Extension availability | Missing features | Install required extensions on target |

### LOW RISKS

| Risk | Impact | Mitigation |
|------|--------|------------|
| UUID generation differences | Duplicate IDs | Use uuid-ossp extension |
| Timestamp timezone handling | Time display issues | Ensure TIMESTAMPTZ consistency |

---

## 12. DATA THAT MUST NOT BE LOST

### 12.1 User Data
- All user accounts (profiles)
- All authentication data (if exportable)
- All user settings
- All user certifications
- All user crypto keys (E2E encryption)

### 12.2 Social Data
- All friend relationships
- All friend requests
- All follower relationships
- All block/mute relationships
- All user alliances

### 12.3 Content Data
- All posts
- All comments (with threading)
- All likes
- All shares
- All post purges

### 12.4 Messaging Data
- All conversations
- All conversation participants
- All messages (including edited/deleted)
- All message reactions
- All message trash
- All group messages
- All group message reactions/reads

### 12.5 Economy Data
- All credit balances
- All credit transactions
- All credit transfers
- All redemption activities
- All redemption requests
- All redemptions

### 12.6 Gaming Data
- All game seasons
- All game presence
- All game challenges
- All game sessions
- All game challenge results
- All game rankings
- All game match history
- All game purge events
- All game audit logs
- All game notifications
- All matchmaking queue entries
- All matches
- All tournaments
- All tournament participants

### 12.7 Survival System Data
- All user survival states
- All survival events
- All survival history
- All purge cooldowns
- All alliance support actions
- All alliance cooldowns

### 12.8 Security/Audit Data
- All security events
- All superadmin audit logs
- All system error logs

### 12.9 Notification Data
- All notifications
- All push subscriptions

### 12.10 Media Data
- All files in Supabase Storage
- All media references in database columns

### 12.11 Localization Data
- All translations

---

## 13. EXPORT PLAN

### 13.1 Safe Export Commands

**DO NOT EXECUTE WITHOUT EXPLICIT INSTRUCTION**

#### Database Schema Export
```bash
# Schema-only dump (structure, no data)
pg_dump --schema-only --no-owner --no-privileges \
  -h db.XXXX.supabase.co \
  -U postgres \
  -d postgres \
  -f puurga_schema.sql
```

#### Database Data Export
```bash
# Data-only dump (no structure)
pg_dump --data-only --no-owner --no-privileges \
  -h db.XXXX.supabase.co \
  -U postgres \
  -d postgres \
  -f puurga_data.sql
```

#### Complete Export
```bash
# Full dump (structure + data)
pg_dump --no-owner --no-privileges \
  -h db.XXXX.supabase.co \
  -U postgres \
  -d postgres \
  -f puurga_complete.sql
```

#### Table-Specific Export
```bash
# Export specific tables
pg_dump --no-owner --no-privileges \
  -h db.XXXX.supabase.co \
  -U postgres \
  -d postgres \
  -t public.profiles \
  -t public.posts \
  -t public.comments \
  -t public.likes \
  -t public.messages \
  -t public.friends \
  -t public.notifications \
  -f puurga_core.sql
```

### 13.2 What Should Be Exported Separately

| Data | Export Method | Notes |
|------|--------------|-------|
| Supabase Auth users | Supabase dashboard or API | May need service role key |
| Supabase Storage files | Supabase dashboard or API | Download all files |
| Supabase Realtime config | Supabase dashboard | Document current subscriptions |
| RLS policies | Schema dump | Included in pg_dump |

### 13.3 Schemas to NOT Blindly Restore

| Schema | Reason |
|--------|--------|
| `auth` | Supabase-specific auth infrastructure |
| `storage` | Supabase-specific storage infrastructure |
| `realtime` | Supabase-specific realtime infrastructure |
| `extensions` | May conflict with target PostgreSQL extensions |

### 13.4 Extension Handling

| Extension | Purpose | Migration |
|-----------|---------|-----------|
| `uuid-ossp` | UUID generation | Install on target |
| `pgcrypto` | Cryptographic functions | Install on target |
| `pg_trgm` | Trigram similarity search | Install on target |
| `pg_stat_statements` | Query statistics | Optional on target |

---

## 14. VERIFICATION PLAN

### 14.1 Row Count Verification

| Table | Source Count | Target Count | Match |
|-------|-------------|--------------|-------|
| profiles | ? | ? | ☐ |
| posts | ? | ? | ☐ |
| comments | ? | ? | ☐ |
| likes | ? | ? | ☐ |
| messages | ? | ? | ☐ |
| friends | ? | ? | ☐ |
| notifications | ? | ? | ☐ |
| (all other tables) | ? | ? | ☐ |

### 14.2 ID Verification

| Check | Method | Pass |
|-------|--------|------|
| Primary key uniqueness | SELECT id, COUNT(*) GROUP BY id HAVING COUNT(*) > 1 | ☐ |
| Foreign key integrity | Verify all FK references exist | ☐ |
| UUID format validity | Check all UUIDs are valid format | ☐ |

### 14.3 Relationship Verification

| Check | Method | Pass |
|-------|--------|------|
| posts → profiles | Verify all posts.user_id exists in profiles | ☐ |
| comments → posts | Verify all comments.post_id exists in posts | ☐ |
| likes → posts | Verify all likes.post_id exists in posts | ☐ |
| messages → conversations | Verify all messages.conversation_id exists | ☐ |
| friends → profiles | Verify all friends.user_id/friend_id exist | ☐ |
| (all other FK relationships) | Verify integrity | ☐ |

### 14.4 Constraint Verification

| Check | Method | Pass |
|-------|--------|------|
| CHECK constraints | Verify all CHECK constraints work | ☐ |
| UNIQUE constraints | Verify all UNIQUE constraints work | ☐ |
| NOT NULL constraints | Verify all NOT NULL constraints work | ☐ |
| DEFAULT values | Verify all DEFAULT values work | ☐ |

### 14.5 Sequence Verification

| Check | Method | Pass |
|-------|--------|------|
| Primary key sequences | Verify sequences are set to max(id) + 1 | ☐ |
| Auto-increment columns | Verify identity columns work | ☐ |

### 14.6 Media Reference Verification

| Check | Method | Pass |
|-------|--------|------|
| Avatar URLs | Verify all avatar_url references resolve | ☐ |
| Cover photo URLs | Verify all cover_photo references resolve | ☐ |
| Post image URLs | Verify all post image references resolve | ☐ |
| Message image URLs | Verify all message image references resolve | ☐ |

### 14.7 Authentication Mapping

| Check | Method | Pass |
|-------|--------|------|
| User ID mapping | Verify auth.users.id ↔ profiles.id mapping | ☐ |
| Email uniqueness | Verify all emails are unique | ☐ |
| Password hashes | Verify hashes are importable (if applicable) | ☐ |

### 14.8 Credits/Transactions Verification

| Check | Method | Pass |
|-------|--------|------|
| Balance consistency | Verify profiles.credits = SUM(credit_transactions.amount) | ☐ |
| Transaction integrity | Verify all transactions have valid user_id | ☐ |
| No negative balances | Verify no profiles.credits < 0 | ☐ |

### 14.9 Messages Verification

| Check | Method | Pass |
|-------|--------|------|
| Message count | Verify message counts match | ☐ |
| Conversation integrity | Verify all messages belong to valid conversations | ☐ |
| Read status | Verify read status is preserved | ☐ |

### 14.10 Notifications Verification

| Check | Method | Pass |
|-------|--------|------|
| Notification count | Verify notification counts match | ☐ |
| Read status | Verify is_read status is preserved | ☐ |
| Metadata integrity | Verify JSONB metadata is preserved | ☐ |

---

## APPENDIX A: MIGRATION CHECKLIST

### Pre-Migration
- [ ] Export Supabase database (schema + data)
- [ ] Export Supabase Auth users
- [ ] Export Supabase Storage files
- [ ] Document all RLS policies
- [ ] Document all database functions/triggers
- [ ] Create target PostgreSQL database
- [ ] Install required extensions

### Migration
- [ ] Import schema (without auth/storage/realtime schemas)
- [ ] Import data (in dependency order)
- [ ] Create custom auth system
- [ ] Migrate storage to local/S3
- [ ] Complete WebSocket migration
- [ ] Update backend middleware
- [ ] Update frontend auth client

### Post-Migration
- [ ] Run row count verification
- [ ] Run ID verification
- [ ] Run relationship verification
- [ ] Run constraint verification
- [ ] Run sequence verification
- [ ] Run media reference verification
- [ ] Run authentication mapping verification
- [ ] Run credits/transactions verification
- [ ] Run messages verification
- [ ] Run notifications verification
- [ ] Test all application features
- [ ] Monitor for errors

---

## APPENDIX B: ENVIRONMENT VARIABLES

### Frontend (.env)
```
VITE_SUPABASE_URL=<REPLACE>
VITE_SUPABASE_ANON_KEY=<REPLACE>
JWT_SECRET=<NEW>
```

### Backend (.env)
```
SUPABASE_URL=<REPLACE>
SUPABASE_ANON_KEY=<REPLACE>
SUPABASE_SERVICE_ROLE_KEY=<REPLACE>
SUPABASE_JWT_SECRET=<REPLACE>
SUPABASE_DB_URL=<REPLACE>
JWT_SECRET=<NEW>
DATABASE_URL=<NEW>
```

---

**END OF MIGRATION DOSSIER**

**Status:** Phase 1 Reconnaissance Complete  
**Next Step:** Review dossier, then proceed to Phase 2 (Extraction) upon approval.
