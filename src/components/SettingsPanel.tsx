import { memo } from 'react';
import type { Settings, AccentColor, BackgroundImage } from '../domain/types';
import { DEFAULT_DISPLAY_SCREENS, DEFAULT_ROTATION_INTERVAL } from '../domain/configPersistence';
import { DISPLAY_LAYOUTS } from '../domain/logic';
import { useTranslation } from '../i18n';
import { NumberStepper } from './NumberStepper';
import { useTheme } from '../theme';
import { CollapsibleSubSection } from './CollapsibleSubSection';

interface Props {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onToggleFullscreen: () => void;
  onShowInstallGuide?: (() => void) | undefined;
  canUseCustomAccent?: boolean | undefined;
  canUseCustomBackground?: boolean | undefined;
  canUseCustomLayout?: boolean | undefined;
  onOpenFeatureGate?: ((feature: string) => void) | undefined;
}

function CheckBox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-all duration-200 ${
        checked
          ? 'shadow-sm'
          : 'bg-gray-200 dark:bg-gray-700/80 border border-gray-300 dark:border-gray-600/60'
      }`}
      style={checked ? { background: 'linear-gradient(to bottom, var(--accent-400), var(--accent-600))', boxShadow: `0 1px 2px var(--accent-glow)` } : undefined}
    >
      {checked && (
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

const ACCENT_OPTIONS: { value: AccentColor; color: string; label: string }[] = [
  { value: 'emerald', color: '#10b981', label: 'Emerald' },
  { value: 'blue',    color: '#3b82f6', label: 'Blue' },
  { value: 'purple',  color: '#8b5cf6', label: 'Purple' },
  { value: 'red',     color: '#ef4444', label: 'Red' },
  { value: 'amber',   color: '#f59e0b', label: 'Amber' },
  { value: 'cyan',    color: '#06b6d4', label: 'Cyan' },
];

const BG_OPTIONS: { value: BackgroundImage; gradient: string; labelKey: string }[] = [
  { value: 'none',       gradient: 'linear-gradient(135deg, #e5e7eb, #d1d5db)', labelKey: 'settings.bgNone' },
  { value: 'felt-green', gradient: 'radial-gradient(circle, rgba(22,163,74,0.5) 0%, rgba(22,163,74,0.2) 100%)', labelKey: 'settings.bgFeltGreen' },
  { value: 'felt-blue',  gradient: 'radial-gradient(circle, rgba(37,99,235,0.5) 0%, rgba(37,99,235,0.2) 100%)', labelKey: 'settings.bgFeltBlue' },
  { value: 'felt-red',   gradient: 'radial-gradient(circle, rgba(185,28,28,0.5) 0%, rgba(185,28,28,0.2) 100%)', labelKey: 'settings.bgFeltRed' },
  { value: 'casino',     gradient: 'repeating-linear-gradient(45deg, rgba(245,158,11,0.15) 0px, rgba(245,158,11,0.15) 2px, transparent 2px, transparent 6px)', labelKey: 'settings.bgCasino' },
  { value: 'dark-wood',  gradient: 'linear-gradient(180deg, rgba(120,80,40,0.4) 0%, rgba(80,50,20,0.5) 100%)', labelKey: 'settings.bgDarkWood' },
  { value: 'abstract',   gradient: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(6,182,212,0.3))', labelKey: 'settings.bgAbstract' },
  { value: 'midnight',   gradient: 'linear-gradient(180deg, rgba(30,58,138,0.5) 0%, rgba(88,28,135,0.4) 100%)', labelKey: 'settings.bgMidnight' },
  { value: 'sunset',     gradient: 'linear-gradient(135deg, rgba(245,158,11,0.4), rgba(239,68,68,0.4))', labelKey: 'settings.bgSunset' },
];

export const SettingsPanel = memo(function SettingsPanel({ settings, onChange, onToggleFullscreen, onShowInstallGuide, canUseCustomAccent = true, canUseCustomBackground = true, canUseCustomLayout = true, onOpenFeatureGate }: Props) {
  const { t } = useTranslation();
  const { accentColor, setAccentColor, backgroundImage, setBackgroundImage } = useTheme();

  const toggle = (key: keyof Settings) => {
    onChange({ ...settings, [key]: !settings[key] });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('settings.title')}</h3>

      {/* Section 1: Audio Quick-Access (Sound + Volume) */}
      <CollapsibleSubSection title={t('settings.sectionAudio' as Parameters<typeof t>[0])} defaultOpen={true}>
        <div className="space-y-2">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-gray-700 dark:text-gray-300">{t('settings.sound')}</span>
            <CheckBox checked={settings.soundEnabled} onChange={() => toggle('soundEnabled')} />
          </label>
          {settings.soundEnabled && (
            <div className="flex items-center gap-3 pl-1">
              <span className="text-xs text-gray-500 dark:text-gray-400 w-20 shrink-0">{t('settings.volume')}</span>
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
              <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums w-8 text-right">{settings.volume}%</span>
            </div>
          )}
        </div>
      </CollapsibleSubSection>

      {/* Section 2: Timer & Game Flow (default open) */}
      <CollapsibleSubSection title={t('settings.sectionTimer' as Parameters<typeof t>[0])} defaultOpen={true}>
        <div className="space-y-2">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-gray-700 dark:text-gray-300">{t('settings.autoAdvance')}</span>
            <CheckBox checked={settings.autoAdvance} onChange={() => toggle('autoAdvance')} />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-gray-700 dark:text-gray-300">{t('settings.largeDisplay')}</span>
            <CheckBox checked={settings.largeDisplay} onChange={() => toggle('largeDisplay')} />
          </label>
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
          <button
            onClick={onToggleFullscreen}
            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors text-left"
          >
            {t('settings.fullscreen')}
          </button>
          {onShowInstallGuide && (
            <button
              onClick={onShowInstallGuide}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors text-left flex items-center gap-2"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 3v12m0 0l-4-4m4 4l4-4" />
              </svg>
              {t('settings.installApp' as Parameters<typeof t>[0])}
            </button>
          )}
        </div>
      </CollapsibleSubSection>

      {/* Section 3: Appearance (default open) */}
      <CollapsibleSubSection title={t('settings.sectionAppearance' as Parameters<typeof t>[0])} defaultOpen={true}>
        <div className="space-y-4">
          {/* Accent Color */}
          <div>
            <span className="text-sm text-gray-700 dark:text-gray-300 block mb-1.5">{t('settings.accentColor')}</span>
            <div className="flex items-center gap-2">
              {ACCENT_OPTIONS.map((opt) => {
                const locked = !canUseCustomAccent && opt.value !== 'emerald';
                return (
                  <button
                    key={opt.value}
                    onClick={() => locked && onOpenFeatureGate ? onOpenFeatureGate('customAccent') : setAccentColor(opt.value)}
                    className={`w-9 h-9 rounded-full transition-all duration-200 relative ${
                      accentColor === opt.value
                        ? 'ring-2 scale-110'
                        : locked ? 'opacity-30 cursor-not-allowed' : 'opacity-60 hover:opacity-100 hover:scale-105'
                    }`}
                    style={{
                      backgroundColor: opt.color,
                      ...(accentColor === opt.value
                        ? { ringColor: opt.color, boxShadow: `0 0 0 2px var(--accent-ring), 0 0 8px ${opt.color}40` }
                        : {}),
                    }}
                    title={locked ? 'Premium' : opt.label}
                    aria-label={opt.label}
                  >
                    {locked && <span className="absolute inset-0 flex items-center justify-center text-xs">&#x1F512;</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Background Image */}
          <div>
            <span className="text-sm text-gray-700 dark:text-gray-300 block mb-1.5">{t('settings.backgroundImage')}</span>
            <div className="grid grid-cols-3 gap-1.5">
              {BG_OPTIONS.map((opt) => {
                const FREE_BGS = ['none', 'felt-green'];
                const bgLocked = !canUseCustomBackground && !FREE_BGS.includes(opt.value);
                return (
                <button
                  key={opt.value}
                  onClick={() => bgLocked && onOpenFeatureGate ? onOpenFeatureGate('customBackground') : setBackgroundImage(opt.value)}
                  className={`relative w-full aspect-[3/2] rounded-lg overflow-hidden transition-all duration-200 border-2 ${
                    backgroundImage === opt.value
                      ? 'scale-[1.02]'
                      : bgLocked ? 'border-gray-300 dark:border-gray-700/60 opacity-30 cursor-not-allowed' : 'border-gray-300 dark:border-gray-700/60 hover:border-gray-400 dark:hover:border-gray-600 opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    background: opt.gradient,
                    ...(backgroundImage === opt.value
                      ? { borderColor: 'var(--accent-500)', boxShadow: `0 0 0 1px var(--accent-ring)` }
                      : {}),
                  }}
                  title={bgLocked ? 'Premium' : t(opt.labelKey as Parameters<typeof t>[0])}
                  aria-label={t(opt.labelKey as Parameters<typeof t>[0])}
                >
                  <span className="absolute bottom-0 inset-x-0 text-[9px] text-center py-0.5 bg-black/30 text-white truncate">
                    {bgLocked ? '\u{1F512} ' : ''}{t(opt.labelKey as Parameters<typeof t>[0])}
                  </span>
                </button>
                );
              })}
            </div>
          </div>

          {/* TV Display Screen Configuration */}
          <CollapsibleSubSection title={t('display.screenConfig' as Parameters<typeof t>[0])} defaultOpen={false}>
            <div className="space-y-2">
              {(DEFAULT_DISPLAY_SCREENS).map((screen) => {
                const userScreens = settings.displayScreens ?? DEFAULT_DISPLAY_SCREENS;
                const screenCfg = userScreens.find((s) => s.id === screen.id);
                const isEnabled = screenCfg ? screenCfg.enabled : true;
                return (
                  <label key={screen.id} className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {t(`display.screen.${screen.id}` as Parameters<typeof t>[0])}
                    </span>
                    <CheckBox
                      checked={isEnabled}
                      onChange={() => {
                        const current = settings.displayScreens ?? DEFAULT_DISPLAY_SCREENS.map((s) => ({ ...s }));
                        const updated = current.map((s) =>
                          s.id === screen.id ? { ...s, enabled: !s.enabled } : s,
                        );
                        // Ensure at least one screen stays enabled
                        const anyEnabled = updated.some((s) => s.enabled);
                        if (!anyEnabled) return;
                        onChange({ ...settings, displayScreens: updated });
                      }}
                    />
                  </label>
                );
              })}
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
            </div>
          </CollapsibleSubSection>

          {/* Display Layout */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.displayLayout' as Parameters<typeof t>[0])}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DISPLAY_LAYOUTS.map((l) => {
                const layoutLocked = !canUseCustomLayout && l.id !== 'standard';
                return (
                <button
                  key={l.id}
                  onClick={() => layoutLocked && onOpenFeatureGate ? onOpenFeatureGate('customLayout') : onChange({ ...settings, displayLayout: l.id })}
                  className={`p-2 rounded-lg border text-left text-xs transition-all ${
                    (settings.displayLayout ?? 'standard') === l.id
                      ? 'border-[var(--accent-500)] bg-[color-mix(in_srgb,var(--accent-500)_10%,transparent)]'
                      : layoutLocked ? 'border-gray-300 dark:border-gray-700/60 opacity-40 cursor-not-allowed' : 'border-gray-300 dark:border-gray-700/60 hover:border-gray-400 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100">{layoutLocked ? '\u{1F512} ' : ''}{t(l.labelKey as Parameters<typeof t>[0])}</div>
                  <div className="text-gray-500 dark:text-gray-400 mt-0.5">{t(l.descKey as Parameters<typeof t>[0])}</div>
                </button>
                );
              })}
            </div>
          </div>

          {/* Dealer badges toggle */}
        </div>
      </CollapsibleSubSection>

      {/* Keyboard shortcuts reference */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700/40">
        <h4 className="text-xs text-gray-300 dark:text-gray-600 uppercase tracking-wider mb-1">{t('settings.shortcuts')}</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-400 dark:text-gray-500">
          <span><kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800/80 rounded-md border border-gray-300 dark:border-gray-700/50 text-gray-500 dark:text-gray-400 shadow-sm shadow-gray-200/30 dark:shadow-black/10">Space</kbd> {t('settings.shortcutStartPause')}</span>
          <span><kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800/80 rounded-md border border-gray-300 dark:border-gray-700/50 text-gray-500 dark:text-gray-400 shadow-sm shadow-gray-200/30 dark:shadow-black/10">N</kbd> {t('settings.shortcutNext')}</span>
          <span><kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800/80 rounded-md border border-gray-300 dark:border-gray-700/50 text-gray-500 dark:text-gray-400 shadow-sm shadow-gray-200/30 dark:shadow-black/10">V</kbd> {t('settings.shortcutPrevious')}</span>
          <span><kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800/80 rounded-md border border-gray-300 dark:border-gray-700/50 text-gray-500 dark:text-gray-400 shadow-sm shadow-gray-200/30 dark:shadow-black/10">R</kbd> {t('settings.shortcutReset')}</span>
          <span><kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800/80 rounded-md border border-gray-300 dark:border-gray-700/50 text-gray-500 dark:text-gray-400 shadow-sm shadow-gray-200/30 dark:shadow-black/10">C</kbd> {t('settings.shortcutClock')}</span>
        </div>
      </div>
    </div>
  );
});
