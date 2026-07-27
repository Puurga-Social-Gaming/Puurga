# Puurga Game Isolation + UX Modernization Plan

## Architecture Decisions

1. **Economy**: Purga Rift and Cyber Runner keep their own localStorage economies for now. Judgment, Watchman, Redemption use the unified credit system via `useCredits`. Future work can unify.
2. **Routes**: Old paths (`/next-game`, `/new-game`) preserved with redirects. New canonical paths: `/games/<slug>`.
3. **Arcade**: Single page with tabs (Featured, All, Stats, Achievements, Social). Sub-routes for game detail.
4. **GamingDashboard**: Kept as sidebar widget, refactored to read from `games/catalog.ts`.

## File Structure

```
src/
├── shared/
│   ├── game-shell/
│   │   ├── GameShell.tsx          # Unified shell (merges both IntegratedGameShell variants)
│   │   ├── useViewportLock.ts     # From useIntegratedGameViewport.ts
│   │   ├── mobile.css             # From integratedGameMobile.css
│   │   └── types.ts               # PuurgaGameProps, PuurgaGameMeta
│   ├── economy/
│   │   ├── useCredits.ts          # Re-export from hooks/useCredits.ts
│   │   └── GameEconomy.ts         # Re-export from constants/GameEconomy.ts
│   └── presence/
│       └── useGamePresence.ts     # Re-export from hooks/useGamePresence.ts
├── games/
│   ├── catalog.ts                 # Dynamic registry (metadata only)
│   ├── GameLauncher.tsx           # Dynamic loader + error boundary
│   ├── _coming-soon/
│   │   └── ComingSoon.tsx
│   ├── judgment/
│   │   ├── index.ts
│   │   └── JudgmentGame.tsx       # From PurgaSlicer.tsx
│   ├── watchman/
│   │   ├── index.ts
│   │   └── WatchmanGame.tsx       # From TheNextGame.tsx
│   ├── redemption/
│   │   ├── index.ts
│   │   └── RedemptionGame.tsx     # From NewGameCode.tsx
│   ├── purga-rift/
│   │   ├── index.ts
│   │   ├── PurgaRiftGame.tsx      # From IntegratedGame/PASTE_GAME_HERE.tsx
│   │   └── riftStyles.ts         # From IntegratedGame/riftGameStyles.ts
│   └── cyber-runner/
│       ├── index.ts
│       └── CyberRunnerGame.tsx    # From IntegratedGameSlot2/PASTE_GAME_HERE.tsx
├── components/Games/
│   ├── GameIconTile.tsx           # Stays
│   ├── GameLauncher.tsx           # Re-exports from games/
│   └── ...                        # Arcade UI components (Phase 5)
└── pages/
    └── PurgaGames/
        └── PurgaGames.tsx         # Redesigned arcade (Phase 4)
```

## Phases

### Phase 1: Foundation (shared/ + catalog)
- Create `src/shared/` directory
- Create `src/shared/game-shell/types.ts`
- Create `src/shared/game-shell/useViewportLock.ts`
- Create `src/shared/game-shell/mobile.css`
- Create `src/shared/game-shell/GameShell.tsx`
- Create `src/shared/economy/useCredits.ts`
- Create `src/shared/economy/GameEconomy.ts`
- Create `src/shared/presence/useGamePresence.ts`
- Create `src/games/_coming-soon/ComingSoon.tsx`
- Create `src/games/catalog.ts`
- Create `src/games/GameLauncher.tsx`

### Phase 2: Move self-contained games
- Move Purga Rift → `src/games/purga-rift/`
- Move Cyber Runner → `src/games/cyber-runner/`
- Create index.ts lazy exports

### Phase 3: Move dependent games
- Move Judgment → `src/games/judgment/` (rewire useCredits)
- Move Watchman → `src/games/watchman/` (rewire useCredits)
- Move Redemption → `src/games/redemption/` (rewire useCredits + GAME_ECONOMY)
- Create index.ts lazy exports

### Phase 4: Wire routing + Arcade redesign
- Update App.tsx routes to use GameLauncher
- Add redirects for old paths
- Redesign PurgaGames.tsx as full arcade dashboard
- Update GamingDashboard to read from catalog

### Phase 5: Arcade features
- Game grid with filtering/search
- Game detail page
- Stats page
- Social/leaderboard page
- Achievements display framework
