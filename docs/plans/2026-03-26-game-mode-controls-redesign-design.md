# Game Mode Controls Redesign — Design Document

**Date**: 2026-03-26
**Version**: 6.12.1
**Status**: Approved

## Problem

The v6.12.0 Controls restructure moved too many gameplay actions into a ··· popover, making commonly used functions (Last Hand, Hand-for-Hand, Call the Clock, Undo/Redo) harder to access. "Clean View" hides controls entirely instead of just hiding informational panels.

## Design

### Controls Layout (unter dem Timer)

**Row 1 — Transport** (unchanged):
- ← Previous | ▶ Start/Pause | Next →

**Row 2 — Icon-Buttons** (compact, always visible):
- ↩ Undo | ↪ Redo | 🖐 Last Hand | H4H | ⏱ Call the Clock
- Small icon buttons with minimal labels, toggle states via color/opacity

**Row 3 — Contextual** (only during breaks or H4H):
- Break: Skip Break, +2 Min, +5 Min
- H4H active + paused: Next Hand button

**Row 4 — Details Toggle** (only when details are hidden):
- ☰ "Details einblenden" button, centered

### "Details ausblenden" Behavior

Hides:
- RebuyStatus
- Left Sidebar (PlayerPanel)
- Right Sidebar (LevelPreview, ChipSidebar, MultiTablePanel)

Always visible:
- GameInfoBar (players, prizepool, avg BB, elapsed, remaining)
- TimerDisplay
- BubbleIndicator (priority banners)
- All Controls (transport + icon buttons + contextual)

### Re-showing Details

Two independent mechanisms:
1. Central ☰ button below controls (appears only when details hidden)
2. Sidebar toggle arrows (◄ ►) at screen edges (always functional)

### Settings Modal (⚙️)

One-time configuration only:
- Sound on/off + volume
- Auto-advance toggle
- Large display toggle
- Call-the-Clock duration (NumberStepper)
- Fullscreen button
- Accent color picker
- Background image picker
- Display layout picker
- TV screen config (which screens, rotation interval)
- Keyboard shortcut reference
- Reset Level button (moved from ··· popover)
- Restart Tournament button (moved from ··· popover)

### Changes vs. v6.12.0

| Element | v6.12.0 | v6.12.1 |
|---------|---------|---------|
| Last Hand, H4H, CtC | ··· popover | Direct icon buttons |
| Undo/Redo | ··· popover | Direct icon buttons |
| ··· popover | Exists | Removed |
| Clean View | Hides controls + info | Renamed → "Details", hides sidebars + RebuyStatus only |
| Reset Level | ··· popover | ⚙️ Settings modal |
| Restart Tournament | ··· popover | ⚙️ Settings modal |
| Details toggle | Via ··· popover | Central ☰ button + sidebar arrows |

### Files to Modify

- `Controls.tsx` — Remove popover, add icon button row, add details toggle button
- `GameModeContainer.tsx` — Update clean view logic (sidebars + rebuy only)
- `GameSettingsModal.tsx` / `SettingsPanel.tsx` — Add Reset/Restart buttons
- `translations.ts` — New/updated keys for icon buttons and details toggle
- `tests/controls.test.tsx` — Update for new button layout
- `tests/components.test.tsx` — Update clean view behavior tests
