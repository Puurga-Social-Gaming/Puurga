# Player Challenges — Scalable Schema

## Status: Hardened for scale
## Migration: `backend/migrations/20260716_game_challenges.sql`

### Architecture
| Table | Role |
|-------|------|
| `game_seasons` | Seasonal ladders |
| `game_presence` | Live “playing now” |
| `game_challenges` | Wager contract (friendly / ranked / tournament) |
| `game_sessions` | Actual play instance ≠ challenge |
| `game_challenge_results` | Validated outcomes (`SERVER` / `AI` / `ADMIN`) |
| `game_rankings` | Wins + **Elo** per season |
| `game_match_history` | Duration, ended_reason, elo before/after |
| `game_purge_events` | Bankruptcy events for Survival |
| `game_audit_logs` | Support / anti-fraud trail |
| `game_notifications` | Gaming-specific inbox |

### Critical design rule
Games emit `GAME_PLAYER_BANKRUPT` → **SurvivalEngine** decides Ghost/Purgatory.  
Games never write `profiles.is_ghost` directly.

### Apply in Supabase
Re-run the full migration file (idempotent `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`).
