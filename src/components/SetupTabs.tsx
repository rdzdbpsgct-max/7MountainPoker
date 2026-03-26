import { useTranslation } from '../i18n';

type TabStatus = 'complete' | 'incomplete' | 'warning';

interface Props {
  activeTab: number;
  onTabChange: (index: number) => void;
  tabStatus: {
    basis: TabStatus;
    players: TabStatus;
    structure: TabStatus;
    review: TabStatus;
  };
}

const TAB_ICONS = ['\u{1F3AF}', '\u{1F465}', '\u{1F4CA}', '\u{1F680}'];

export function SetupTabs({ activeTab, onTabChange, tabStatus }: Props) {
  const { t } = useTranslation();
  const tabKeys = ['basis', 'players', 'structure', 'review'] as const;
  const tabLabels = [
    t('app.tournamentBasics'),
    t('app.players'),
    t('setup.tabStructure' as Parameters<typeof t>[0]),
    t('setup.tabStart' as Parameters<typeof t>[0]),
  ];

  const completedCount = Object.values(tabStatus).filter(s => s === 'complete').length;
  const progress = Math.round((completedCount / 4) * 100);

  return (
    <div className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/60 backdrop-blur-md border-b border-gray-200 dark:border-gray-700/40">
      <div className="max-w-2xl mx-auto">
        <div role="tablist" className="flex">
          {tabKeys.map((key, i) => {
            const status = tabStatus[key];
            const isActive = activeTab === i;
            return (
              <button
                key={key}
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(i)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors relative
                  ${isActive
                    ? 'text-[var(--accent-500)] border-b-2 border-[var(--accent-500)]'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-200 dark:hover:text-gray-300'
                  }`}
              >
                <span className="hidden sm:inline">{TAB_ICONS[i]}</span>
                <span className="hidden sm:inline">{tabLabels[i]}</span>
                <span className="sm:hidden text-lg">{TAB_ICONS[i]}</span>
                {status === 'complete' && (
                  <span className="text-[var(--accent-500)] text-xs">{'\u2713'}</span>
                )}
                {status === 'warning' && (
                  <span className="text-amber-500 text-xs">{'\u26A0'}</span>
                )}
              </button>
            );
          })}
        </div>
        <div
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-0.5 bg-gray-200 dark:bg-gray-800"
        >
          <div
            className="h-full bg-gradient-to-r from-[var(--accent-500)] to-[var(--accent-400)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
