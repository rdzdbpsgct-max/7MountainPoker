import { useState, useCallback, useMemo } from 'react';
import type { League, GameDay, GameDayParticipant, RegisteredPlayer } from '../domain/types';
import { saveGameDay, loadGameDaysForLeague, loadPlayerDatabase, normalizePlayerName } from '../domain/logic';
import { useTranslation } from '../i18n';
import { useDialogA11y } from '../hooks/useDialogA11y';

interface Props {
  league: League;
  editingGameDay?: GameDay | undefined;
  onClose: () => void;
  onSaved: () => void;
  currencySymbol: string;
}

interface EditableParticipant {
  id: string;
  name: string;
  place: number;
  buyIn: number;
  rebuys: number;
  addOnCost: number;
  payout: number;
  isGuest: boolean;
}

export function GameDayEditor({ league, editingGameDay, onClose, onSaved, currencySymbol }: Props) {
  const { t } = useTranslation();
  const dialogRef = useDialogA11y(onClose);

  const registeredPlayersDb = useMemo<RegisteredPlayer[]>(() => loadPlayerDatabase(), []);
  const registeredPlayers = useMemo(() => registeredPlayersDb.map((p) => p.name).sort(), [registeredPlayersDb]);

  const [date, setDate] = useState(() =>
    editingGameDay?.date ?? new Date().toISOString().split('T')[0]!,
  );
  const [label, setLabel] = useState(() => {
    if (editingGameDay?.label) return editingGameDay.label;
    const existing = loadGameDaysForLeague(league.id);
    return t('league.editor.gameDayLabel', { n: existing.length + 1 });
  });
  const [venue, setVenue] = useState(editingGameDay?.venue ?? '');
  const [notes, setNotes] = useState(editingGameDay?.notes ?? '');
  const [defaultBuyIn, setDefaultBuyIn] = useState(() =>
    editingGameDay?.participants[0]?.buyIn ?? league.defaultConfig?.buyIn ?? 10,
  );

  const [participants, setParticipants] = useState<EditableParticipant[]>(() => {
    if (editingGameDay) {
      return editingGameDay.participants.map((p, i) => ({
        id: `p_${i}`,
        name: p.name,
        place: p.place,
        buyIn: p.buyIn,
        rebuys: p.rebuys,
        addOnCost: p.addOnCost,
        payout: p.payout,
        isGuest: p.isGuest ?? false,
      }));
    }
    return [];
  });

  const [newPlayerName, setNewPlayerName] = useState('');

  const handleAddPlayer = useCallback(() => {
    const name = newPlayerName.trim();
    if (!name) return;
    // Prevent duplicate names
    if (participants.some((p) => normalizePlayerName(p.name) === normalizePlayerName(name))) return;
    setParticipants((prev) => [
      ...prev,
      {
        id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        place: prev.length + 1,
        buyIn: defaultBuyIn,
        rebuys: 0,
        addOnCost: 0,
        payout: 0,
        isGuest: false,
      },
    ]);
    setNewPlayerName('');
  }, [newPlayerName, participants, defaultBuyIn]);

  const handleRemovePlayer = useCallback((id: string) => {
    setParticipants((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      // Re-number places
      return filtered.map((p, i) => ({ ...p, place: i + 1 }));
    });
  }, []);

  const handleUpdateParticipant = useCallback((id: string, field: keyof EditableParticipant, value: string | number | boolean) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  }, []);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    setParticipants((prev) => {
      const copy = [...prev];
      [copy[index - 1], copy[index]] = [copy[index]!, copy[index - 1]!];
      return copy.map((p, i) => ({ ...p, place: i + 1 }));
    });
  }, []);

  const handleMoveDown = useCallback((index: number) => {
    setParticipants((prev) => {
      if (index >= prev.length - 1) return prev;
      const copy = [...prev];
      [copy[index], copy[index + 1]] = [copy[index + 1]!, copy[index]!];
      return copy.map((p, i) => ({ ...p, place: i + 1 }));
    });
  }, []);

  // Calculate derived values
  const pointMap = useMemo(
    () => new Map(league.pointSystem.entries.map((e) => [e.place, e.points])),
    [league.pointSystem],
  );

  const totalBuyIns = useMemo(
    () => participants.reduce((sum, p) => sum + p.buyIn + p.rebuys * p.buyIn + p.addOnCost, 0),
    [participants],
  );

  const totalPayouts = useMemo(
    () => participants.reduce((sum, p) => sum + p.payout, 0),
    [participants],
  );

  // Build a name→id lookup for registered players (case-insensitive)
  const playerIdMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const rp of registeredPlayersDb) {
      map.set(normalizePlayerName(rp.name), rp.id);
    }
    return map;
  }, [registeredPlayersDb]);

  const handleSave = useCallback(() => {
    if (participants.length < 2) return;

    const gdParticipants: GameDayParticipant[] = participants.map((p) => {
      const registeredPlayerId = playerIdMap.get(normalizePlayerName(p.name));
      return {
        name: p.name,
        place: p.place,
        points: pointMap.get(p.place) ?? 0,
        buyIn: p.buyIn,
        rebuys: p.rebuys,
        addOnCost: p.addOnCost,
        payout: p.payout,
        netBalance: p.payout - p.buyIn - p.rebuys * p.buyIn - p.addOnCost,
        isGuest: p.isGuest || undefined,
        ...(registeredPlayerId ? { registeredPlayerId } : {}),
      };
    });

    const gameDay: GameDay = {
      id: editingGameDay?.id ?? `gd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      leagueId: league.id,
      seasonId: league.activeSeasonId,
      date,
      label: label || undefined,
      tournamentResultId: editingGameDay?.tournamentResultId,
      participants: gdParticipants,
      totalPrizePool: totalPayouts,
      totalBuyIns,
      cashBalance: totalBuyIns - totalPayouts,
      notes: notes || undefined,
      venue: venue || undefined,
    };

    saveGameDay(gameDay);
    onSaved();
  }, [participants, pointMap, playerIdMap, editingGameDay, league, date, label, totalPayouts, totalBuyIns, notes, venue, onSaved]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="gameday-editor-title" className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700/40">
          <h2 id="gameday-editor-title" className="text-lg font-bold text-gray-900 dark:text-white">
            {editingGameDay ? t('league.editor.editTitle') : t('league.editor.title')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl transition-colors"
            aria-label={t('accessibility.close')}
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Date, Label, Venue */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                {t('league.editor.date')}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                {t('league.editor.label')}
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={100}
                className="w-full bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                {t('league.editor.venue')}
              </label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder={t('league.editor.venuePlaceholder')}
                maxLength={100}
                className="w-full bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:outline-none"
              />
            </div>
          </div>

          {/* Default Buy-In */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {t('league.editor.defaultBuyIn')}
            </label>
            <input
              type="number"
              value={defaultBuyIn}
              onChange={(e) => setDefaultBuyIn(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-20 bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded-lg px-2 py-1 text-sm text-center focus:ring-2 focus:outline-none"
              min={0}
              max={999999}
            />
            <span className="text-xs text-gray-400">{currencySymbol}</span>
          </div>

          {/* Add Player */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddPlayer(); }}
              list="editor-registered-players"
              placeholder={t('league.editor.addPlayerPlaceholder')}
              aria-label={t('league.editor.addPlayerName')}
              maxLength={50}
              className="flex-1 bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:outline-none"
            />
            <button
              onClick={handleAddPlayer}
              className="px-3 py-1.5 text-white rounded-lg text-sm font-medium"
              style={{ backgroundColor: 'var(--accent-600)' }}
            >
              + {t('league.editor.addPlayer')}
            </button>
          </div>
          <datalist id="editor-registered-players">
            {registeredPlayers.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>

          {/* Participants Table */}
          {participants.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700/40 text-left">
                    <th className="px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 w-10">#</th>
                    <th className="px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">{t('league.editor.playerName')}</th>
                    <th className="px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 w-16">{t('league.editor.buyInCol')}</th>
                    <th className="px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 w-16">{t('league.editor.rebuysCol')}</th>
                    <th className="px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 w-16">{t('league.editor.addOnCol')}</th>
                    <th className="px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 w-20">{t('league.editor.payoutCol')}</th>
                    <th className="px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 w-12">{t('league.editor.pointsCol')}</th>
                    <th className="px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 w-16">{t('league.editor.guest')}</th>
                    <th className="px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p, idx) => {
                    const netBalance = p.payout - p.buyIn - p.rebuys * p.buyIn - p.addOnCost;
                    const pts = pointMap.get(p.place) ?? 0;
                    return (
                      <tr key={p.id} className="border-b border-gray-100 dark:border-gray-700/20 hover:bg-gray-50 dark:hover:bg-gray-700/20">
                        <td className="px-2 py-1.5 text-gray-500 dark:text-gray-400 font-medium">{p.place}.</td>
                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-900 dark:text-white">{p.name}</span>
                            {p.isGuest && (
                              <span className="text-2xs px-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">G</span>
                            )}
                            <span className={`text-xs ml-1 ${netBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {netBalance >= 0 ? '+' : ''}{netBalance} {currencySymbol}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            value={p.buyIn}
                            onChange={(e) => handleUpdateParticipant(p.id, 'buyIn', Math.max(0, parseInt(e.target.value, 10) || 0))}
                            className="w-14 bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded px-1 py-0.5 text-center text-sm focus:ring-2 focus:outline-none"
                            min={0}
                            max={999999}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            value={p.rebuys}
                            onChange={(e) => handleUpdateParticipant(p.id, 'rebuys', Math.max(0, parseInt(e.target.value, 10) || 0))}
                            className="w-12 bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded px-1 py-0.5 text-center text-sm focus:ring-2 focus:outline-none"
                            min={0}
                            max={99}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            value={p.addOnCost}
                            onChange={(e) => handleUpdateParticipant(p.id, 'addOnCost', Math.max(0, parseInt(e.target.value, 10) || 0))}
                            className="w-14 bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded px-1 py-0.5 text-center text-sm focus:ring-2 focus:outline-none"
                            min={0}
                            max={999999}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            value={p.payout}
                            onChange={(e) => handleUpdateParticipant(p.id, 'payout', Math.max(0, parseInt(e.target.value, 10) || 0))}
                            className="w-16 bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded px-1 py-0.5 text-center text-sm focus:ring-2 focus:outline-none"
                            min={0}
                            max={9999999}
                          />
                        </td>
                        <td className="px-2 py-1.5 font-bold text-center" style={{ color: 'var(--accent-text)' }}>{pts}</td>
                        <td className="px-2 py-1.5 text-center">
                          <input
                            type="checkbox"
                            checked={p.isGuest}
                            onChange={(e) => handleUpdateParticipant(p.id, 'isGuest', e.target.checked)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleMoveUp(idx)}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs px-1"
                              disabled={idx === 0}
                              aria-label={t('accessibility.moveUp')}
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => handleMoveDown(idx)}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs px-1"
                              disabled={idx === participants.length - 1}
                              aria-label={t('accessibility.moveDown')}
                            >
                              ▼
                            </button>
                            <button
                              onClick={() => handleRemovePlayer(p.id)}
                              className="text-red-400 hover:text-red-600 text-xs px-1"
                              aria-label={t('accessibility.remove')}
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary */}
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700/40">
            <span>{participants.length} {t('league.editor.players')}</span>
            <span>{t('league.editor.totalBuyIns')}: {totalBuyIns} {currencySymbol}</span>
            <span>{t('league.editor.totalPayouts')}: {totalPayouts} {currencySymbol}</span>
            <span className={totalBuyIns - totalPayouts >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
              {t('league.finances.saldo')}: {totalBuyIns - totalPayouts >= 0 ? '+' : ''}{totalBuyIns - totalPayouts} {currencySymbol}
            </span>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('league.editor.notes')}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={100}
              rows={2}
              className="w-full bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:outline-none resize-none"
              placeholder={t('league.editor.notesPlaceholder')}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700/40">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm transition-colors"
          >
            {t('league.view.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={participants.length < 2}
            className="px-4 py-2 text-white rounded-lg text-sm font-medium shadow-md transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(to bottom, var(--accent-600), var(--accent-700))' }}
          >
            {t('league.editor.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
