import { useState, useMemo, useCallback } from 'react';
import type { TournamentConfig } from '../domain/types';
import { CURRENCY_SYMBOLS } from '../domain/types';
import type { BlindSpeed } from '../domain/logic';
import {
  defaultConfig,
  defaultPlayers,
  defaultPayoutForPlayerCount,
  generateBlindStructure,
  estimateAllDurations,
  markWizardCompleted,
  snapSpinnerValue,
} from '../domain/logic';
import { useTranslation } from '../i18n';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NumberStepper } from './NumberStepper';

type WizardStep = 'welcome' | 'players' | 'buyIn' | 'blindSpeed' | 'tips' | 'review';

const STEPS: WizardStep[] = ['welcome', 'players', 'buyIn', 'blindSpeed', 'tips', 'review'];

interface Props {
  onComplete: (config: TournamentConfig) => void;
  onSkip: () => void;
}

export function SetupWizard({ onComplete, onSkip }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<WizardStep>('welcome');
  const [playerCount, setPlayerCount] = useState(6);
  const [buyIn, setBuyIn] = useState(10);
  const [startingChips, setStartingChips] = useState(20000);
  const [speed, setSpeed] = useState<BlindSpeed>('normal');

  const stepIndex = STEPS.indexOf(step);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  const goNext = useCallback(() => {
    if (!isLast) setStep(STEPS[stepIndex + 1]);
  }, [stepIndex, isLast]);

  const goBack = useCallback(() => {
    if (!isFirst) setStep(STEPS[stepIndex - 1]);
  }, [stepIndex, isFirst]);

  // Duration estimates
  const estimates = useMemo(
    () => estimateAllDurations(startingChips, false, playerCount),
    [startingChips, playerCount],
  );

  const formatDuration = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.round((totalSeconds % 3600) / 60);
    return t('blindGenerator.duration', { h, m });
  };

  const handleComplete = useCallback(() => {
    const base = defaultConfig();
    const levels = generateBlindStructure({ startingChips, speed, anteEnabled: false });
    const players = defaultPlayers(playerCount, t);
    const config: TournamentConfig = {
      ...base,
      buyIn,
      startingChips,
      levels,
      players,
      payout: defaultPayoutForPlayerCount(playerCount),
      rebuy: { ...base.rebuy, rebuyCost: buyIn, rebuyChips: startingChips },
      addOn: { ...base.addOn, cost: buyIn, chips: startingChips },
    };
    markWizardCompleted();
    onComplete(config);
  }, [startingChips, speed, playerCount, buyIn, t, onComplete]);

  const handleSkip = useCallback(() => {
    markWizardCompleted();
    onSkip();
  }, [onSkip]);

  const speeds: { key: BlindSpeed; label: string; desc: string }[] = [
    { key: 'fast', label: t('blindGenerator.fast'), desc: t('blindGenerator.fastDesc') },
    { key: 'normal', label: t('blindGenerator.normal'), desc: t('blindGenerator.normalDesc') },
    { key: 'slow', label: t('blindGenerator.slow'), desc: t('blindGenerator.slowDesc') },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white/95 dark:bg-gray-900/95 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl shadow-gray-300/40 dark:shadow-black/40 animate-scale-in">
        {/* Step indicator dots */}
        <div className="flex justify-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                i > stepIndex ? 'bg-gray-300 dark:bg-gray-600' : ''
              }`}
              style={i === stepIndex
                ? { backgroundColor: 'var(--accent-500)', boxShadow: '0 0 6px color-mix(in srgb, var(--accent-500) 50%, transparent)' }
                : i < stepIndex
                ? { backgroundColor: 'color-mix(in srgb, var(--accent-500) 40%, transparent)' }
                : undefined
              }
            />
          ))}
        </div>

        {/* Step content */}
        <div className="min-h-[260px] flex flex-col items-center justify-center animate-fade-in" key={step}>
          {step === 'welcome' && (
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{t('wizard.welcome')}</h2>
              <p className="text-gray-500 dark:text-gray-400 text-lg">{t('wizard.welcomeDesc')}</p>
              <div className="flex justify-center pt-4">
                <LanguageSwitcher />
              </div>
            </div>
          )}

          {step === 'players' && (
            <div className="text-center space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('wizard.players')}</h2>
              <div className="flex justify-center">
                <NumberStepper
                  value={playerCount}
                  onChange={(v) => setPlayerCount(Math.max(2, Math.min(20, v)))}
                  min={2}
                  max={20}
                  step={1}
                  inputClassName="w-20 text-center text-2xl"
                />
              </div>
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                {t('section.playerCount', { n: playerCount })}
              </p>
            </div>
          )}

          {step === 'buyIn' && (
            <div className="text-center space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('wizard.buyInStep')}</h2>
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-500 dark:text-gray-400 w-24 text-right">{t('app.buyIn')}</label>
                  <NumberStepper
                    value={buyIn}
                    onChange={(v) => setBuyIn(Math.max(1, v))}
                    min={1}
                    step={1}
                    inputClassName="w-20 text-center"
                  />
                  <span className="text-gray-400 dark:text-gray-500 text-sm">{CURRENCY_SYMBOLS['EUR']}</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-500 dark:text-gray-400 w-24 text-right">{t('app.startingChips')}</label>
                  <NumberStepper
                    value={startingChips}
                    onChange={(raw) => setStartingChips(snapSpinnerValue(raw, startingChips, 1000))}
                    min={1}
                    step={1000}
                    inputClassName="w-24 text-center"
                  />
                  <span className="text-gray-400 dark:text-gray-500 text-sm">{t('unit.chips')}</span>
                </div>
              </div>
            </div>
          )}

          {step === 'blindSpeed' && (
            <div className="text-center space-y-6 w-full">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('wizard.blindSpeed')}</h2>
              <div className="flex flex-col gap-3">
                {speeds.map((s) => {
                  const estimate = estimates.find((e) => e.speed === s.key);
                  const isSelected = speed === s.key;
                  return (
                    <button
                      key={s.key}
                      onClick={() => setSpeed(s.key)}
                      className={`flex items-center justify-between px-5 py-4 rounded-xl text-left transition-all duration-200 ${
                        isSelected
                          ? 'border-2 text-gray-900 dark:text-white shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-800/60 border-2 border-gray-200 dark:border-gray-700/40 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600/70'
                      }`}
                      style={isSelected ? { backgroundColor: 'color-mix(in srgb, var(--accent-700) 30%, transparent)', borderColor: 'color-mix(in srgb, var(--accent-500) 60%, transparent)', boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--accent-900) 20%, transparent)' } : undefined}
                    >
                      <div>
                        <span className="text-lg font-semibold">{s.label}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">{s.desc}</span>
                      </div>
                      {estimate && (
                        <span className={`text-sm font-medium ${isSelected ? '' : 'text-gray-400 dark:text-gray-500'}`} style={isSelected ? { color: 'var(--accent-400)' } : undefined}>
                          {formatDuration(estimate.totalSeconds)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 'tips' && (
            <div className="text-center space-y-5 w-full">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('wizard.tips')}</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('wizard.tipsDesc')}</p>
              </div>
              <div className="flex flex-col gap-3">
                {([
                  { icon: '\uD83D\uDCF1', title: t('wizard.tipRemote'), desc: t('wizard.tipRemoteDesc') },
                  { icon: '\uD83D\uDCFA', title: t('wizard.tipTV'), desc: t('wizard.tipTVDesc') },
                  { icon: '\uD83C\uDFA4', title: t('wizard.tipVoice'), desc: t('wizard.tipVoiceDesc') },
                ] as const).map((tip) => (
                  <div
                    key={tip.title}
                    className="flex items-start gap-3 px-4 py-3 rounded-xl text-left bg-gray-50/80 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/40"
                  >
                    <span className="text-2xl leading-none mt-0.5">{tip.icon}</span>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{tip.title}</p>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{tip.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="text-center space-y-4 w-full">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('wizard.review')}</h2>
              <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 space-y-2 text-left">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{t('app.players')}</span>
                  <span className="text-gray-900 dark:text-white font-medium">{playerCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{t('app.buyIn')}</span>
                  <span className="text-gray-900 dark:text-white font-medium">{buyIn} {CURRENCY_SYMBOLS['EUR']}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{t('app.startingChips')}</span>
                  <span className="text-gray-900 dark:text-white font-medium">{startingChips.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{t('wizard.blindSpeed')}</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {speeds.find((s) => s.key === speed)?.label}
                  </span>
                </div>
                {(() => {
                  const estimate = estimates.find((e) => e.speed === speed);
                  return estimate ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">{t('blindGenerator.estimated')}</span>
                      <span className="text-gray-900 dark:text-white font-medium">{formatDuration(estimate.totalSeconds)}</span>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700/40">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {t('wizard.skip')}
          </button>
          <div className="flex gap-3">
            {!isFirst && (
              <button
                onClick={goBack}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors border border-gray-200 dark:border-gray-700/40"
              >
                {t('wizard.back')}
              </button>
            )}
            {isLast ? (
              <button
                onClick={handleComplete}
                className="px-6 py-2 btn-accent-gradient text-white rounded-lg text-sm font-bold transition-all duration-200 active:scale-[0.97]"
              >
                {t('wizard.start')}
              </button>
            ) : (
              <button
                onClick={goNext}
                className="px-6 py-2 btn-accent-gradient text-white rounded-lg text-sm font-medium transition-all duration-200 active:scale-[0.97]"
              >
                {t('wizard.next')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
