# Games - Integrated Game Slots

## Status: Partially Implemented
## Priority: High

## Current State
- Two integrated game slots exist as placeholders
- Slot 1: Purga Rift (placeholder)
- Slot 2: Cyber Runner (placeholder)
- Files are named PASTE_GAME_HERE.tsx
- No actual game implementations

## What Needs to Be Fixed
- Implement Purga Rift game for Slot 1
- Implement Cyber Runner game for Slot 2
- Replace PASTE_GAME_HERE.tsx files with actual games
- Integrate with existing game economy system
- Ensure lazy loading works correctly
- Add game-specific mechanics and scoring

## Technical Notes
- Slot files: Currently PASTE_GAME_HERE.tsx placeholders
- Catalog: Listed in /src/config/puurgaGamesCatalog.ts
- Purga Rift: Strategy/Hard - 520 coins
- Cyber Runner: Action/Medium - 480 coins
- Loading: Code-split loading already implemented
- Economy: Use existing GAME_ECONOMY constants

## Acceptance Criteria
- Both integrated games are fully playable
- Games match their catalog descriptions
- Credit rewards work correctly
- Lazy loading functions properly
- Games integrate seamlessly with system
- UI/UX is consistent with PurgaSlicer

