import { useState, useCallback, useMemo } from 'react';
import type { Player } from '../domain/types';
import { generatePlayerId, movePlayer, shufflePlayers, loadPlayerDatabase } from '../domain/logic';
import { useTranslation } from '../i18n';
import { NumberStepper } from './NumberStepper';

interface Props {
  players: Player[];
  dealerIndex: number;
  onChange: (players: Player[], dealerIndex: number) => void;
  multiTableEnabled?: boolean | undefined;
  onShuffleToTables?: (() => void) | undefined;
}

/**
 * Inner component that owns drag state.
 * Re-keyed externally when players.length changes.
 */
function PlayerManagerInner({ players, dealerIndex, onChange, multiTableEnabled, onShuffleToTables }: Props) {
  const { t } = useTranslation();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showShuffleConfirm, setShowShuffleConfirm] = useState(false);

  // Load registered player names for autocomplete (sorted by most recently played)
  const registeredNames = useMemo(() => {
    const db = loadPlayerDatabase();
    return db
      .sort((a, b) => b.lastPlayedAt.localeCompare(a.lastPlayedAt))
      .map((p) => p.name);
  }, []);

  const setPlayerCount = (count: number) => {
    const clamped = Math.max(2, Math.min(20, count));
    if (clamped > players.length) {
      const newPlayers = [...players];
      for (let i = players.length; i < clamped; i++) {
        newPlayers.push({ id: generatePlayerId(), name: t('playerManager.playerN', { n: i + 1 }), rebuys: 0, addOn: false, status: 'active', placement: null, eliminatedBy: null, knockouts: 0 });
      }
      onChange(newPlayers, Math.min(dealerIndex, newPlayers.length - 1));
    } else if (clamped < players.length) {
      onChange(players.slice(0, clamped), Math.min(dealerIndex, clamped - 1));
    }
  };

  const updateName = (index: number, name: string) => {
    const updated = players.map((p, i) => (i === index ? { ...p, name } : p));
    onChange(updated, dealerIndex);
  };

  const handleMove = useCallback((index: number, direction: -1 | 1) => {
    const dealerPlayerId = players[dealerIndex]?.id;
    const moved = movePlayer(players, index, direction);
    if (moved === players) return;
    const newDealerIndex = dealerPlayerId
      ? moved.findIndex((p) => p.id === dealerPlayerId)
      : dealerIndex;
    onChange(moved, newDealerIndex >= 0 ? newDealerIndex : 0);
  }, [players, dealerIndex, onChange]);

  const handleShuffle = useCallback(() => {
    const result = shufflePlayers(players);
    // Rotate so dealer is at index 0
    const rotated = [
      ...result.players.slice(result.dealerIndex),
      ...result.players.slice(0, result.dealerIndex),
    ];
    onChange(rotated, 0);
  }, [players, onChange]);

  const handleSetDealer = useCallback((index: number) => {
    onChange(players, index);
  }, [players, onChange]);

  // --- HTML5 Drag & Drop ---

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && index !== draggedIndex) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    const dealerPlayerId = players[dealerIndex]?.id;
    const result = [...players];
    const [dragged] = result.splice(draggedIndex, 1);
    result.splice(dropIndex, 0, dragged!);
    const newDealerIndex = dealerPlayerId
      ? result.findIndex((p) => p.id === dealerPlayerId)
      : 0;
    onChange(result, newDealerIndex >= 0 ? newDealerIndex : 0);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-3">
      {/* Player count */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('playerManager.count')}</label>
        <NumberStepper
          value={players.length}
          onChange={(n) => setPlayerCount(n)}
          min={2}
          max={20}
          step={1}
        />
      </div>

      {/* Player list with seating controls */}
      {players.length > 0 && (
        <div className="space-y-1">
          {players.map((player, i) => (
            <div
              key={player.id}
              draggable
              onDragStart={(e) => handleDragStart(e, i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={(e) => handleDrop(e, i)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all ${
                draggedIndex === i ? 'opacity-40' : ''
              } ${
                dragOverIndex === i && draggedIndex !== null
                  ? 'border-t-2'
                  : 'border-t-2 border-transparent'
              }`}
              style={dragOverIndex === i && draggedIndex !== null ? { borderTopColor: 'var(--accent-500)' } : undefined}
            >
              {/* Drag handle */}
              <span className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 hover:text-gray-700 dark:hover:text-gray-400 text-sm select-none" title={t('playerManager.dragTooltip')}>
                ⠿
              </span>

              {/* Seat number */}
              <span className="text-gray-400 dark:text-gray-500 text-xs w-5 text-right shrink-0">{i + 1}.</span>

              {/* Dealer badge */}
              {i === dealerIndex ? (
                <span
                  className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-sm shadow-red-500/30"
                  title={t('playerManager.dealer')}
                >
                  D
                </span>
              ) : (
                <button
                  onClick={() => handleSetDealer(i)}
                  className="w-5 h-5 rounded-full border border-gray-200 dark:border-gray-700/40 text-gray-300 dark:text-gray-600 hover:border-red-500 hover:text-red-400 text-[10px] font-bold flex items-center justify-center shrink-0 transition-colors"
                  title={t('playerManager.setDealer')}
                >
                  D
                </button>
              )}

              {/* Name input with autocomplete from player database */}
              <input
                type="text"
                value={player.name}
                onChange={(e) => updateName(i, e.target.value)}
                list="registered-players"
                placeholder={t('playerManager.playerN', { n: i + 1 })}
                maxLength={50}
                className="flex-1 min-w-0 px-2 py-1 bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-[var(--accent-500)] focus:ring-2 focus:ring-[var(--accent-ring)] transition-all duration-200"
              />

              {/* Arrow buttons */}
              <button
                onClick={() => handleMove(i, -1)}
                disabled={i === 0}
                className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 transition-colors"
                title={t('playerManager.moveUp')}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                onClick={() => handleMove(i, 1)}
                disabled={i === players.length - 1}
                className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 transition-colors"
                title={t('playerManager.moveDown')}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Datalist for player name autocomplete */}
      <datalist id="registered-players">
        {registeredNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {/* Shuffle button + confirmation */}
      {players.length >= 2 && !showShuffleConfirm && (
        <button
          onClick={() => setShowShuffleConfirm(true)}
          className="px-4 py-2 text-white rounded-lg text-sm font-medium transition-all duration-200"
          style={{ backgroundColor: 'var(--accent-600)' }}
        >
          🔀 {t('playerManager.shuffle')}
        </button>
      )}
      {showShuffleConfirm && (
        <div className="px-3 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700/40 rounded-lg space-y-2">
          <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
            {t('playerManager.shuffleConfirm')}
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-500/70">
            {t('playerManager.shuffleWarning')}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowShuffleConfirm(false)}
              className="flex-1 px-2 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-xs font-medium transition-colors"
            >
              {t('app.cancel')}
            </button>
            <button
              onClick={() => { handleShuffle(); setShowShuffleConfirm(false); }}
              className="flex-1 px-2 py-1.5 bg-accent-700 text-white rounded-lg text-xs font-medium transition-colors"
            >
              🔀 {t('playerManager.shuffleConfirmBtn')}
            </button>
          </div>
        </div>
      )}
      {multiTableEnabled && onShuffleToTables && players.length >= 2 && (
        <button
          onClick={onShuffleToTables}
          className="px-4 py-2 text-white rounded-lg text-sm font-medium transition-all duration-200"
          style={{ backgroundColor: 'var(--accent-600)' }}
        >
          🎲 {t('players.shuffleToTables')}
        </button>
      )}
    </div>
  );
}

/**
 * Wrapper that re-keys the inner component when players.length changes.
 */
export function PlayerManager({ players, dealerIndex, onChange, multiTableEnabled, onShuffleToTables }: Props) {
  return (
    <PlayerManagerInner
      key={players.length}
      players={players}
      dealerIndex={dealerIndex}
      onChange={onChange}
      multiTableEnabled={multiTableEnabled}
      onShuffleToTables={onShuffleToTables}
    />
  );
}
