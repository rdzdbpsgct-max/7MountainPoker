# Audio-Einstellungen in Setup + Sidebar-Lesbarkeit — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move audio/voice/custom-audio settings to the setup page and fix sidebar readability (NumberStepper clipping, overflow, dimensions).

**Architecture:** Add `settings` + `onSettingsChange` + `onShowCustomAudio` props to SetupPage/SetupModeContainer. Create a new "Audio & Ansagen" CollapsibleSection on the setup page. Slim down SettingsPanel's audio section to quick-access only. Fix sidebar dimensions and NumberStepper layout.

**Tech Stack:** React, TypeScript, Tailwind CSS, existing CollapsibleSection/CollapsibleSubSection/NumberStepper/AlertEditor components.

---

### Task 1: Thread settings props through SetupModeContainer → SetupPage

**Files:**
- Modify: `src/components/modes/SetupModeContainer.tsx`
- Modify: `src/components/SetupPage.tsx` (Props interface only)
- Modify: `src/App.tsx:969-978` (SetupModeContainer render)

**Step 1: Add settings props to SetupModeContainer**

In `src/components/modes/SetupModeContainer.tsx`, add to imports and Props:

```tsx
import type { TournamentConfig, TournamentCheckpoint, Settings } from '../../domain/types';

interface Props {
  config: TournamentConfig;
  setConfig: Dispatch<SetStateAction<TournamentConfig>>;
  settings: Settings;                        // NEW
  onSettingsChange: (s: Settings) => void;   // NEW
  onShowCustomAudio: () => void;             // NEW
  pendingCheckpoint: TournamentCheckpoint | null;
  onRestoreCheckpoint: () => void;
  onDismissCheckpoint: () => void;
  onSwitchToGame: () => void;
  onConfirm: (title: string, message: string, confirmLabel: string, onConfirm: () => void) => void;
  startErrors: string[];
}
```

Pass them through to SetupPage:
```tsx
<SetupPage
  config={config}
  setConfig={setConfig}
  settings={settings}
  onSettingsChange={onSettingsChange}
  onShowCustomAudio={onShowCustomAudio}
  pendingCheckpoint={pendingCheckpoint}
  ...
/>
```

**Step 2: Add settings props to SetupPage Props interface**

In `src/components/SetupPage.tsx:35-44`, add to Props:

```tsx
interface Props {
  config: TournamentConfig;
  setConfig: React.Dispatch<React.SetStateAction<TournamentConfig>>;
  settings: Settings;                        // NEW
  onSettingsChange: (s: Settings) => void;   // NEW
  onShowCustomAudio: () => void;             // NEW
  pendingCheckpoint: TournamentCheckpoint | null;
  ...
}
```

Add `Settings` to the import from `../../domain/types`.

**Step 3: Wire props in App.tsx**

In `src/App.tsx` at the SetupModeContainer render (~line 969), add:

```tsx
<SetupModeContainer
  config={config}
  setConfig={setConfig}
  settings={settings}
  onSettingsChange={setSettings}
  onShowCustomAudio={() => setShowCustomAudio(true)}
  pendingCheckpoint={pendingCheckpoint}
  ...
/>
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Success (no type errors — new props exist but aren't used in JSX yet)

**Step 5: Commit**

```
feat: thread settings props through SetupModeContainer to SetupPage
```

---

### Task 2: Add "Audio & Ansagen" CollapsibleSection to SetupPage

**Files:**
- Modify: `src/components/SetupPage.tsx`
- Modify: `src/i18n/translations.ts`

**Step 1: Add translation key for audio summary**

In `src/i18n/translations.ts`, add to DE section (~line 219 area):
```
'setup.audioSummary.on': 'Sound, {volume}%',
'setup.audioSummary.off': 'Sound aus',
```

Add to EN section (~line 1366 area):
```
'setup.audioSummary.on': 'Sound, {volume}%',
'setup.audioSummary.off': 'Sound off',
```

**Step 2: Add imports to SetupPage**

Add to imports in `src/components/SetupPage.tsx`:
```tsx
import { CollapsibleSubSection } from './CollapsibleSubSection';
import { AlertEditor } from './AlertEditor';
import { NumberStepper } from './NumberStepper';
```

(Check which are already imported — CollapsibleSubSection is likely already there for Multi-Table.)

**Step 3: Add audio summary memo**

After the existing summary memos (~line 99), add:

```tsx
const audioSummary = useMemo(() => {
  if (!settings.soundEnabled) return t('setup.audioSummary.off' as Parameters<typeof t>[0]);
  return t('setup.audioSummary.on' as Parameters<typeof t>[0], { volume: settings.volume });
}, [settings.soundEnabled, settings.volume, t]);
```

**Step 4: Add Audio CollapsibleSection JSX**

Insert between the Chips section (line 825) and the Validation section (line 827):

```tsx
{/* Audio & Ansagen (collapsed by default) */}
<CollapsibleSection title={t('settings.sectionAudio' as Parameters<typeof t>[0])} summary={audioSummary} defaultOpen={false}>
  <div className="space-y-3">
    {/* Sound toggle */}
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-gray-700 dark:text-gray-300">{t('settings.sound')}</span>
      <button
        type="button"
        role="switch"
        aria-checked={settings.soundEnabled}
        onClick={() => onSettingsChange({ ...settings, soundEnabled: !settings.soundEnabled })}
        className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-all duration-200 ${
          settings.soundEnabled
            ? 'shadow-sm'
            : 'bg-gray-200 dark:bg-gray-700/80 border border-gray-300 dark:border-gray-600/60'
        }`}
        style={settings.soundEnabled ? { background: 'linear-gradient(to bottom, var(--accent-400), var(--accent-600))', boxShadow: `0 1px 2px var(--accent-glow)` } : undefined}
      >
        {settings.soundEnabled && (
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
    </label>

    {/* Volume slider */}
    {settings.soundEnabled && (
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 dark:text-gray-400 w-20 shrink-0">{t('settings.volume')}</span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={settings.volume}
          onChange={(e) => onSettingsChange({ ...settings, volume: Number(e.target.value) })}
          className="flex-1 h-1.5 cursor-pointer"
          style={{ accentColor: 'var(--accent-500)' }}
        />
        <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums w-8 text-right">{settings.volume}%</span>
      </div>
    )}

    {/* Countdown toggle */}
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-gray-700 dark:text-gray-300">{t('settings.countdown')}</span>
      <button
        type="button"
        role="switch"
        aria-checked={settings.countdownEnabled}
        onClick={() => onSettingsChange({ ...settings, countdownEnabled: !settings.countdownEnabled })}
        className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-all duration-200 ${
          settings.countdownEnabled
            ? 'shadow-sm'
            : 'bg-gray-200 dark:bg-gray-700/80 border border-gray-300 dark:border-gray-600/60'
        }`}
        style={settings.countdownEnabled ? { background: 'linear-gradient(to bottom, var(--accent-400), var(--accent-600))', boxShadow: `0 1px 2px var(--accent-glow)` } : undefined}
      >
        {settings.countdownEnabled && (
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
    </label>

    {/* Custom Alerts */}
    <CollapsibleSubSection title={t('alerts.title')} defaultOpen={false}>
      <AlertEditor
        alerts={settings.customAlerts ?? []}
        onChange={(alerts) => onSettingsChange({ ...settings, customAlerts: alerts })}
      />
    </CollapsibleSubSection>

    {/* Custom Audio Files */}
    <button
      onClick={onShowCustomAudio}
      className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors text-left flex items-center gap-2"
    >
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
      </svg>
      {t('customAudio.title')}
    </button>
  </div>
</CollapsibleSection>
```

**Step 5: Verify build + lint**

Run: `npm run lint && npm run build`

**Step 6: Commit**

```
feat: add Audio & Ansagen section to setup page
```

---

### Task 3: Slim down SettingsPanel audio section for game mode

**Files:**
- Modify: `src/components/SettingsPanel.tsx:74-121`

**Step 1: Replace the full audio section with quick-access only**

Replace lines 74–121 (the entire "Section 1: Audio & Announcements" CollapsibleSubSection) with:

```tsx
{/* Section 1: Audio Quick-Access (slim — full config in Setup) */}
<CollapsibleSubSection title={t('settings.sectionAudio' as Parameters<typeof t>[0])} defaultOpen={true}>
  <div className="space-y-2">
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-gray-700 dark:text-gray-300">{t('settings.sound')}</span>
      <CheckBox checked={settings.soundEnabled} onChange={() => toggle('soundEnabled')} />
    </label>
    {settings.soundEnabled && (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{t('settings.volume')}</span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={settings.volume}
          onChange={(e) => onChange({ ...settings, volume: Number(e.target.value) })}
          className="flex-1 h-1.5 cursor-pointer"
          style={{ accentColor: 'var(--accent-500)' }}
        />
        <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums w-7 text-right">{settings.volume}%</span>
      </div>
    )}
  </div>
</CollapsibleSubSection>
```

This removes: countdown toggle, AlertEditor sub-section, Custom Audio button.

**Step 2: Remove unused imports if AlertEditor is no longer used**

Remove `import { AlertEditor } from './AlertEditor';` from SettingsPanel.tsx (line 8) if AlertEditor is no longer referenced.

**Step 3: Remove `onShowCustomAudio` from Props**

In SettingsPanel.tsx Props interface (line 15), remove `onShowCustomAudio?: () => void;`.
Update the function signature (line 62) to remove `onShowCustomAudio`.

**Step 4: Verify build + lint**

Run: `npm run lint && npm run build`

**Step 5: Commit**

```
refactor: slim SettingsPanel audio section to quick-access only
```

---

### Task 4: Fix NumberStepper layout — vertical labels + wider inputs

**Files:**
- Modify: `src/components/SettingsPanel.tsx:134-148` (Call the Clock)
- Modify: `src/components/SettingsPanel.tsx:256-271` (Rotation Interval)

**Step 1: Fix Call the Clock layout (lines 134-148)**

Replace the horizontal `flex items-center justify-between` layout:

```tsx
{/* Call the Clock duration — label on own line, stepper below */}
<div className="space-y-1">
  <span className="text-sm text-gray-700 dark:text-gray-300">{t('settings.callTheClock')}</span>
  <div className="flex items-center gap-1">
    <NumberStepper
      value={settings.callTheClockSeconds}
      onChange={(v) => onChange({ ...settings, callTheClockSeconds: Math.max(10, Math.min(300, v)) })}
      min={10}
      max={300}
      step={5}
      inputClassName="w-16"
    />
    <span className="text-xs text-gray-400 dark:text-gray-500">s</span>
  </div>
</div>
```

**Step 2: Fix Rotation Interval layout (lines 256-271)**

Replace the horizontal layout with the same vertical pattern:

```tsx
<div className="space-y-1 pt-1">
  <span className="text-sm text-gray-700 dark:text-gray-300">
    {t('display.rotationInterval' as Parameters<typeof t>[0])}
  </span>
  <div className="flex items-center gap-1">
    <NumberStepper
      value={settings.displayRotationInterval ?? DEFAULT_ROTATION_INTERVAL}
      onChange={(v) => onChange({ ...settings, displayRotationInterval: Math.max(5, Math.min(60, v)) })}
      min={5}
      max={60}
      step={5}
      inputClassName="w-16"
    />
    <span className="text-xs text-gray-400 dark:text-gray-500">s</span>
  </div>
</div>
```

Key changes: `w-14` → `w-16`, horizontal → vertical layout.

**Step 3: Verify build**

Run: `npm run build`

**Step 4: Commit**

```
fix: NumberStepper vertical layout — labels on own line, wider inputs
```

---

### Task 5: Fix sidebar dimensions

**Files:**
- Modify: `src/components/modes/GameModeContainer.tsx:290`

**Step 1: Update sidebar CSS classes**

In line 290, replace:
```
md:w-60 lg:w-72
```
with:
```
md:w-64 lg:w-72
```

And replace:
```
max-h-[40vh] sm:max-h-[50vh]
```
with:
```
max-h-[60vh] sm:max-h-[70vh]
```

Full updated line 290:
```tsx
<aside className="w-full md:absolute md:right-0 md:top-0 md:bottom-0 md:w-64 lg:w-72 md:z-20 md:shadow-xl md:shadow-black/20 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700/30 bg-gray-50 dark:bg-gray-900/40 p-3 sm:p-4 space-y-4 sm:space-y-6 overflow-y-auto max-h-[60vh] sm:max-h-[70vh] md:max-h-none">
```

**Step 2: Remove onShowCustomAudio prop from GameModeContainer**

Since SettingsPanel no longer has `onShowCustomAudio`, remove:
- The prop from GameModeContainer's Props interface (line ~78): `onShowCustomAudio?: () => void;`
- The prop from the SettingsPanel render (line ~314): `onShowCustomAudio={onShowCustomAudio}`
- The prop from App.tsx GameModeContainer render (~line 1044): `onShowCustomAudio={...}`

**Step 3: Verify build + lint**

Run: `npm run lint && npm run build`

**Step 4: Commit**

```
fix: sidebar wider + taller on mobile, remove unused customAudio prop
```

---

### Task 6: Run all tests + verify

**Files:**
- No new files

**Step 1: Run unit tests**

Run: `npm run test`
Expected: 1090 tests pass

**Step 2: Run E2E tests**

Run: `npx playwright test`
Expected: 14 tests pass

**Step 3: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 4: Final commit with all changes**

If any fixes were needed, commit them:
```
fix: test adjustments for audio-setup refactor
```

---

### Task 7: Update documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `CHANGELOG.md`

**Step 1: Update CLAUDE.md**

- In SetupPage description, add "Audio & Ansagen" section
- Update SettingsPanel description to note slim audio quick-access
- Note sidebar dimension changes

**Step 2: Update CHANGELOG.md**

Add entry for this change (under current version or new patch):
- Audio & Ansagen section on setup page
- SettingsPanel slimmed for game mode
- Sidebar readability fixes (NumberStepper, dimensions)

**Step 3: Commit**

```
docs: audio-setup + sidebar-fixes in CLAUDE.md and CHANGELOG.md
```
