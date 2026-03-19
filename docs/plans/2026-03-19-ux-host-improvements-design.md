# UX Host Improvements Design

## Context
Tournament hosts use laptop/tablet as primary device, optionally smartphone as remote. 10 UX improvements prioritized by real-world host impact.

## Changes

### 1. Show all validation errors at once
- `SetupPage.tsx`: Render `startErrors[]` as full list, not just `[0]`

### 2. Auto-expand multi-table when >10 players
- `SetupPage.tsx`: When `players.length > 10`, auto-open multi-table CollapsibleSubSection

### 3. Compact controls layout
- `Controls.tsx`: Group secondary buttons (Last Hand, H4H, Clean View) into a second row with smaller styling

### 4. Rebuy window closing warning
- `PlayerPanel.tsx` / `RebuyStatus.tsx`: Show "Rebuy noch X Level" countdown badge

### 5. Player name truncation instead of shrinking
- `PlayerPanel.tsx`: Use `truncate` CSS + min font size 12px instead of scaling to 10px

### 6. League table sticky columns + scroll indicator
- `LeagueStandingsTable.tsx`: Sticky Rank+Name columns, gradient fade on right edge

### 7. Clock always visible in header
- `AppHeader.tsx`: Show clock on all viewports (not just desktop)

### 8. Appearance settings more prominent
- `SettingsPanel.tsx`: Move accent color picker out of collapsed section

### 9. Sort arrows on league table headers
- `LeagueStandingsTable.tsx`: Add ▲/▼ indicators on sortable columns

### 10. Sidebar toggle more visible
- `GameModeContainer.tsx`: Replace thin edge strip with visible icon button
