# FEATURES TO CREATE - Missing/Broken Features

This directory contains files for features that are completely missing or broken and need to be created from scratch.

## Files by Category and Priority

### HIGH PRIORITY
- ~~`video_calls_configuration.md`~~ ✅ Completed (hardened)
- ~~`player_challenges.md`~~ ✅ Core implemented — apply `20260716_game_challenges.sql`

### MEDIUM PRIORITY
- `game_servers_infrastructure.md` - Create dedicated game server architecture
- `game_matchmaking.md` - Implement matchmaking system
- `post_view_tracking.md` - Create post view tracking system
- `post_engagement_metrics.md` - Implement engagement metrics
- `message_encryption.md` - Add end-to-end encryption for messages
- `email_phone_verification.md` - Implement email and phone verification

### LOW PRIORITY
- `game_tournaments.md` - Create tournament system
- `game_achievements.md` - Implement achievement system
- `friend_circles_lists.md` - Add custom friend lists/circles
- `birthday_reminders.md` - Create birthday reminders system
- `friend_discovery_advanced.md` - Implement advanced friend discovery
- `biometric_auth.md` - Add biometric authentication support

## Total Features to Create: 12

## How to Use
Each file contains:
- Current state description
- What needs to be created
- Technical notes and suggested approaches
- Acceptance criteria for completion

## Recommended Order
1. Start with HIGH priority items (critical broken features)
2. Move to MEDIUM priority items (important missing features)
3. Complete LOW priority items last (nice-to-have features)

## Important Notes
- Some features require external services (Zego Cloud, SMS providers, etc.)
- Some features may need infrastructure setup (game servers)
- Some features require security considerations (encryption, biometrics)
- Consider dependencies between features before implementation

