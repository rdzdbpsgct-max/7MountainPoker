// Voice announcements — ElevenLabs MP3 for German + English, Web Speech API fallback

import type { Language, TranslationKey } from '../i18n/translations';
import { playAudioSequence, cancelAudioPlayback, setAudioLanguage } from './audioPlayer';
import { getCustomAudioForAnnouncement } from './customAudio';

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

let preferredVoice: SpeechSynthesisVoice | null = null;
let voiceLanguage: Language = 'de';
let voicesLoaded = false;
let speechVolume = 1.0;

/** Set the master volume for speech announcements (0.0 – 1.0). */
export function setSpeechVolume(v: number): void {
  speechVolume = Math.max(0, Math.min(1, v));
}

// ---------------------------------------------------------------------------
// Audio file manifest — known pre-recorded files (identical for DE + EN)
// ---------------------------------------------------------------------------

const BLIND_PAIRS = new Set([
  '1-2','1-3','2-3','2-4','2-5','3-5','3-6','4-8','5-10','6-11','7-13','8-15','8-16',
  '10-19','10-20','12-23','13-25','15-25','15-30','19-38','20-40',
  '23-45','25-45','25-50','30-60','32-63','38-75','40-75','40-80','45-90',
  '50-100','55-110','60-120','65-130','75-125','75-150','80-160','90-180','95-190',
  '100-175','100-200','120-230','120-240','125-250','130-250','150-300','160-310','190-380',
  '200-400','230-450','250-450','250-500','300-550','300-600','320-630','350-650','350-700','380-750',
  '400-750','400-800','450-900','500-950','500-1000','550-1100','600-1200','650-1300',
  '750-1500','800-1600','900-1800','950-1900','1000-2000','1200-2300','1200-2400','1300-2500','1300-2600',
  '1500-3000','1600-3100','1600-3200','1900-3800','2000-4000','2300-4500','2300-4600','2500-5000',
  '3000-6000','3200-6300','3300-6500','3300-6600','3800-7500','3800-7600','4000-8000','4500-9000','5000-10000',
  '6000-12000','6500-12500','6500-13000','7500-15000','8000-16000','10000-20000',
  '12000-24000','12500-25000','13000-25000','15000-30000','20000-40000','25000-50000',
  '30000-60000','40000-80000','50000-100000','60000-120000','80000-160000','100000-200000',
]);

const ANTE_VALUES = new Set([
  '1','1.5','2','2.5','5','10','15','20','25','50',
  '100','150','200','250','500','1000','1500','2000','2500','5000',
]);

const MAX_BREAK_MINUTES = 30;
const MAX_LEVEL = 25;
const MAX_COUNTDOWN = 10;

// Call the Clock seconds values that have pre-recorded MP3s (10–300, step 5)
const CTC_SECONDS = new Set([
  10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,100,
  105,110,115,120,125,130,135,140,145,150,155,160,165,170,175,180,
  185,190,195,200,205,210,215,220,225,230,235,240,245,250,
  255,260,265,270,275,280,285,290,295,300,
]);

// ---------------------------------------------------------------------------
// Unified speech queue — supports both MP3 audio and Web Speech API
// ---------------------------------------------------------------------------

type QueueItem =
  | { mode: 'audio'; files: string[]; fallbackText?: string; fallbackOptions?: { rate?: number; pitch?: number; volume?: number } }
  | { mode: 'speech'; text: string; options?: { rate?: number; pitch?: number; volume?: number } };

let speechQueue: QueueItem[] = [];
let isSpeaking = false;

// ---------------------------------------------------------------------------
// Voice selection (Web Speech API fallback)
// ---------------------------------------------------------------------------

/** Known female voice names across platforms (case-insensitive matching). */
const FEMALE_VOICE_HINTS = [
  'female', 'samantha', 'victoria', 'allison', 'ava', 'karen', 'moira',
  'tessa', 'fiona', 'veena', 'zira', 'anna', 'hedda', 'katja', 'helena',
  'google uk english female', 'google us english female', 'google deutsch',
];

function isFemaleVoice(voice: SpeechSynthesisVoice): boolean {
  const name = voice.name.toLowerCase();
  return FEMALE_VOICE_HINTS.some(hint => name.includes(hint));
}

function findVoice(lang: Language): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  const langPrefix = lang === 'de' ? 'de' : 'en';

  const langVoices = voices.filter(v => v.lang.startsWith(langPrefix));
  if (langVoices.length === 0) return null;

  // Prefer female local voice → female any voice → any local voice → any voice
  const femaleLocal = langVoices.find(v => v.localService && isFemaleVoice(v));
  if (femaleLocal) return femaleLocal;
  const femaleAny = langVoices.find(v => isFemaleVoice(v));
  if (femaleAny) return femaleAny;
  const localAny = langVoices.find(v => v.localService);
  if (localAny) return localAny;
  return langVoices[0];
}

function ensureVoice(): void {
  if (voicesLoaded) return;
  preferredVoice = findVoice(voiceLanguage);
  voicesLoaded = true;
}

/**
 * Update the preferred voice language. Call when the app language changes.
 */
export function setSpeechLanguage(lang: Language): void {
  voiceLanguage = lang;
  voicesLoaded = false;
  preferredVoice = null;
  setAudioLanguage(lang);
}

/**
 * Initialize speech synthesis voices. Call from a user gesture handler.
 */
export function initSpeech(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.getVoices();
    if (!voicesLoaded) {
      window.speechSynthesis.addEventListener('voiceschanged', () => {
        voicesLoaded = false;
        ensureVoice();
      }, { once: true });
    }
  } catch {
    // speechSynthesis not available
  }
}

// ---------------------------------------------------------------------------
// Queue processor
// ---------------------------------------------------------------------------

function processQueue(): void {
  if (isSpeaking || speechQueue.length === 0) return;

  const next = speechQueue.shift()!;
  isSpeaking = true;

  if (next.mode === 'audio') {
    // Wrap playAudioSequence in a 30s timeout to prevent permanent queue stall
    const audioTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('[speech] Audio playback timeout after 30s')), 30_000)
    );
    Promise.race([playAudioSequence(next.files), audioTimeout])
      .then(() => {
        isSpeaking = false;
        processQueue();
      })
      .catch((err) => {
        // MP3 failed or timed out — try Web Speech API fallback
        console.error('[speech] MP3 playback failed, falling back to Web Speech API:', err, 'files:', next.files);
        if (next.fallbackText) {
          speakUtterance(next.fallbackText, next.fallbackOptions, () => {
            isSpeaking = false;
            processQueue();
          });
        } else {
          isSpeaking = false;
          processQueue();
        }
      });
  } else {
    speakUtterance(next.text, next.options, () => {
      isSpeaking = false;
      processQueue();
    });
  }
}

function speakUtterance(
  text: string,
  options: { rate?: number; pitch?: number; volume?: number } | undefined,
  onDone: () => void,
): void {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      onDone();
      return;
    }

    ensureVoice();

    const utterance = new SpeechSynthesisUtterance(text);
    if (preferredVoice) {
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang;
    } else {
      utterance.lang = voiceLanguage === 'de' ? 'de-DE' : 'en-US';
    }
    utterance.rate = options?.rate ?? 1.0;
    utterance.pitch = options?.pitch ?? 1.0;
    utterance.volume = (options?.volume ?? 0.8) * speechVolume;

    // Safety: guard against onend/onerror never firing (browser bug)
    let done = false;
    const safeOnDone = () => {
      if (done) return;
      done = true;
      clearTimeout(safetyTimeout);
      onDone();
    };
    // Timeout: generous max of 15s per utterance to prevent permanent stall
    const safetyTimeout = setTimeout(safeOnDone, 15_000);

    utterance.onend = safeOnDone;
    utterance.onerror = safeOnDone;

    window.speechSynthesis.speak(utterance);
  } catch {
    onDone();
  }
}

// ---------------------------------------------------------------------------
// Public API — enqueue and cancel
// ---------------------------------------------------------------------------

function enqueue(item: QueueItem): void {
  speechQueue.push(item);
  if (!isSpeaking) processQueue();
}

/**
 * Cancel any currently playing announcement (audio + speech) and clear queue.
 */
export function cancelSpeech(): void {
  speechQueue = [];
  isSpeaking = false;
  cancelAudioPlayback();
  try {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  } catch {
    // silent
  }
}

/**
 * Cancel queue and enqueue a single item immediately
 * (used for countdown numbers that must not be delayed).
 */
function enqueueImmediate(item: QueueItem): void {
  cancelSpeech();
  enqueue(item);
}

// ---------------------------------------------------------------------------
// Helper — build audio item with speech fallback
// ---------------------------------------------------------------------------

function audioOrSpeech(
  files: string[],
  fallbackText: string,
  fallbackOptions?: { rate?: number; pitch?: number; volume?: number },
): QueueItem {
  return { mode: 'audio', files, fallbackText, fallbackOptions };
}

// ---------------------------------------------------------------------------
// Custom audio check — user-uploaded MP3 overrides built-in announcements
// ---------------------------------------------------------------------------

/**
 * Play a custom audio file if one is mapped for this announcement key.
 * Returns true if custom audio was found and enqueued, false otherwise.
 */
function enqueueCustomAudioIfAvailable(announcementKey: string): boolean {
  const customFile = getCustomAudioForAnnouncement(announcementKey, voiceLanguage);
  if (!customFile) return false;

  // Create a blob URL from the ArrayBuffer and enqueue as audio
  const blob = new Blob([customFile.data], { type: customFile.mimeType });
  const url = URL.createObjectURL(blob);
  enqueue({ mode: 'audio', files: [url] });
  return true;
}

// ---------------------------------------------------------------------------
// Convenience functions — both DE and EN have MP3 audio files
// ---------------------------------------------------------------------------

/** Level change — "Level 5" + "Blinds" + "200 to 400" [+ "Ante" + "25"] */
export function announceLevelChange(
  levelNumber: number,
  smallBlind: number,
  bigBlind: number,
  ante: number | undefined,
  t: TranslateFn,
): void {
  if (enqueueCustomAudioIfAvailable('level-change')) return;
  const pairKey = `${smallBlind}-${bigBlind}`;
  const canMp3 = levelNumber >= 1 && levelNumber <= MAX_LEVEL && BLIND_PAIRS.has(pairKey);
  const anteOk = !ante || ante <= 0 || ANTE_VALUES.has(String(ante));

  if (canMp3 && anteOk) {
    const files: string[] = [
      `levels/level-${String(levelNumber).padStart(2, '0')}.mp3`,
      'building-blocks/blinds.mp3',
      `blind-pairs/${pairKey}.mp3`,
    ];
    if (ante && ante > 0) {
      files.push(`ante/ante-${ante}.mp3`);
    }
    const fallback = ante && ante > 0
      ? t('voice.levelChangeWithAnte', { level: levelNumber, sb: smallBlind, bb: bigBlind, ante })
      : t('voice.levelChange', { level: levelNumber, sb: smallBlind, bb: bigBlind });
    enqueue(audioOrSpeech(files, fallback));
  } else {
    const text = ante && ante > 0
      ? t('voice.levelChangeWithAnte', { level: levelNumber, sb: smallBlind, bb: bigBlind, ante })
      : t('voice.levelChange', { level: levelNumber, sb: smallBlind, bb: bigBlind });
    enqueue({ mode: 'speech', text });
  }
}

/** Break start — "Break — 10 minutes" / "Pause — 10 Minuten" + optional label */
export function announceBreakStart(
  durationMinutes: number,
  t: TranslateFn,
  label?: string,
): void {
  if (enqueueCustomAudioIfAvailable('break-start')) return;
  if (durationMinutes >= 1 && durationMinutes <= MAX_BREAK_MINUTES) {
    const file = `breaks/break-${String(durationMinutes).padStart(2, '0')}min.mp3`;
    enqueue(audioOrSpeech([file], t('voice.breakStart', { minutes: durationMinutes })));
  } else {
    enqueue({ mode: 'speech', text: t('voice.breakStart', { minutes: durationMinutes }) });
  }
  // Announce custom label via speech — skip generic "Break"/"Pause" defaults
  if (label) {
    const normalized = label.trim().toLowerCase();
    const isDefault = normalized === 'break' || normalized === 'pause';
    if (!isDefault) {
      enqueue({ mode: 'speech', text: label });
    }
  }
}

/** Break warning — "30 seconds left in the break" */
export function announceBreakWarning(t: TranslateFn): void {
  if (enqueueCustomAudioIfAvailable('break-warning')) return;
  enqueue(audioOrSpeech(['fixed/break-warning.mp3'], t('voice.breakWarning')));
}

/**
 * Countdown number (last 10 seconds) — uses immediate mode.
 * Returns true so caller knows voice is handling it (no beep needed).
 */
export function announceCountdown(second: number): boolean {
  if (second >= 1 && second <= MAX_COUNTDOWN) {
    const file = `countdown/countdown-${String(second).padStart(2, '0')}.mp3`;
    enqueueImmediate(audioOrSpeech([file], String(second), { rate: 0.85 }));
  } else {
    enqueueImmediate({ mode: 'speech', text: String(second), options: { rate: 0.85 } });
  }
  return true;
}

/** Bubble — "We're on the bubble!" */
export function announceBubble(t: TranslateFn): void {
  if (enqueueCustomAudioIfAvailable('bubble')) return;
  enqueue(audioOrSpeech(['fixed/bubble.mp3'], t('voice.bubble')));
}

/** In The Money — "In the money! Congratulations!" */
export function announceInTheMoney(t: TranslateFn): void {
  if (enqueueCustomAudioIfAvailable('itm')) return;
  enqueue(audioOrSpeech(['fixed/itm.mp3'], t('voice.inTheMoney')));
}

/** Player eliminated — generic announcement without player name */
export function announceElimination(t: TranslateFn): void {
  if (enqueueCustomAudioIfAvailable('elimination')) return;
  enqueue(audioOrSpeech(['fixed/player-eliminated.mp3'], t('voice.playerEliminated')));
}

/** Tournament winner — generic announcement without player name */
export function announceWinner(t: TranslateFn): void {
  if (enqueueCustomAudioIfAvailable('winner')) return;
  enqueue(audioOrSpeech(['fixed/tournament-winner.mp3'], t('voice.winner')));
}

/** Bounty collected — "Bounty collected! What a knockout!" */
export function announceBounty(t: TranslateFn): void {
  enqueue(audioOrSpeech(['fixed/bounty-collected.mp3'], t('voice.bountyCollected')));
}

/** Add-On available */
export function announceAddOn(t: TranslateFn): void {
  if (enqueueCustomAudioIfAvailable('addon')) return;
  enqueue(audioOrSpeech(['fixed/addon-available.mp3'], t('voice.addOnAvailable')));
}

/** Rebuy available — reminder after elimination during rebuy phase */
export function announceRebuyAvailable(t: TranslateFn): void {
  enqueue(audioOrSpeech(['fixed/rebuy-available.mp3'], t('voice.rebuyAvailable')));
}

/** Rebuy phase ended */
export function announceRebuyEnded(t: TranslateFn): void {
  if (enqueueCustomAudioIfAvailable('rebuy-ended')) return;
  enqueue(audioOrSpeech(['fixed/rebuy-ended.mp3'], t('voice.rebuyEnded')));
}

/** Color-Up — "Color-Up: Chips will be colored up" */
export function announceColorUp(chipLabels: string, t: TranslateFn): void {
  if (enqueueCustomAudioIfAvailable('color-up')) return;
  enqueue(audioOrSpeech(
    ['building-blocks/color-up.mp3', 'fixed/colorup-action.mp3'],
    t('voice.colorUp', { chips: chipLabels }),
  ));
}

/** Tournament start — "Shuffle up and deal!" */
export function announceTournamentStart(t: TranslateFn): void {
  if (enqueueCustomAudioIfAvailable('shuffle-up')) return;
  enqueue(audioOrSpeech(['fixed/shuffle-up-and-deal.mp3'], t('voice.tournamentStart')));
}

/** Heads-Up — "Heads-Up!" */
export function announceHeadsUp(t: TranslateFn): void {
  if (enqueueCustomAudioIfAvailable('heads-up')) return;
  enqueue(audioOrSpeech(['fixed/heads-up.mp3'], t('voice.headsUp')));
}

/** Last hand of the level (or before break) */
export function announceLastHand(nextIsBreak: boolean, t: TranslateFn): void {
  if (enqueueCustomAudioIfAvailable('last-hand')) return;
  if (nextIsBreak) {
    enqueue(audioOrSpeech(['fixed/last-hand-before-break.mp3'], t('voice.lastHandBeforeBreak')));
  } else {
    enqueue(audioOrSpeech(['fixed/last-hand.mp3'], t('voice.lastHand')));
  }
}

/** Five minutes remaining in this level */
export function announceFiveMinutes(t: TranslateFn): void {
  if (enqueueCustomAudioIfAvailable('five-minutes')) return;
  enqueue(audioOrSpeech(['fixed/five-minutes.mp3'], t('voice.fiveMinutes')));
}

/** Three players remaining */
export function announceThreeRemaining(t: TranslateFn): void {
  enqueue(audioOrSpeech(['fixed/three-remaining.mp3'], t('voice.threeRemaining')));
}

/** N players remaining (dynamic count for paidPlaces milestones) */
export function announcePlayersRemaining(count: number, t: TranslateFn): void {
  if (count >= 4 && count <= 10) {
    enqueue(audioOrSpeech(
      [`fixed/${count}-remaining.mp3`],
      t('voice.playersRemaining', { n: count }),
    ));
  } else {
    enqueue({ mode: 'speech', text: t('voice.playersRemaining', { n: count }) });
  }
}

/** Break is over — please take your seats */
export function announceBreakOver(t: TranslateFn): void {
  if (enqueueCustomAudioIfAvailable('break-over')) return;
  enqueue(audioOrSpeech(['fixed/break-over.mp3'], t('voice.breakOver')));
}

/** Break skipped — "Pause übersprungen" / "Break skipped" */
export function announceBreakSkipped(t: TranslateFn): void {
  enqueue({ mode: 'speech', text: t('voice.breakSkipped') });
}

/** Break extended — "Pause verlängert um N Minuten" / "Break extended by N minutes" */
export function announceBreakExtended(minutes: number, t: TranslateFn): void {
  enqueue({ mode: 'speech', text: t('voice.breakExtended', { minutes }) });
}

/** Color-Up warning — next break */
export function announceColorUpWarning(t: TranslateFn): void {
  if (enqueueCustomAudioIfAvailable('color-up-warning')) return;
  enqueue(audioOrSpeech(['fixed/colorup-next-break.mp3'], t('voice.colorUpNextBreak')));
}

/** Timer paused */
export function announceTimerPaused(t: TranslateFn): void {
  if (enqueueCustomAudioIfAvailable('timer-paused')) return;
  enqueue(audioOrSpeech(['fixed/paused.mp3'], t('voice.paused')));
}

/** Timer resumed */
export function announceTimerResumed(t: TranslateFn): void {
  if (enqueueCustomAudioIfAvailable('timer-resumed')) return;
  enqueue(audioOrSpeech(['fixed/resumed.mp3'], t('voice.resumed')));
}

/** Hand-for-Hand mode activated */
export function announceHandForHand(t: TranslateFn): void {
  if (enqueueCustomAudioIfAvailable('hand-for-hand')) return;
  enqueue(audioOrSpeech(['fixed/hand-for-hand.mp3'], t('voice.handForHand')));
}

/** Rebuy taken — a player took a rebuy */
export function announceRebuyTaken(t: TranslateFn): void {
  if (enqueueCustomAudioIfAvailable('rebuy-taken')) return;
  enqueue(audioOrSpeech(['fixed/rebuy-taken.mp3'], t('voice.rebuyTaken')));
}

/** Table move — player moves to a different table (with seat info) */
export function announceTableMove(playerName: string, tableName: string, toSeat: number, t: TranslateFn): void {
  if (enqueueCustomAudioIfAvailable('table-move')) return;
  enqueue(audioOrSpeech(['fixed/table-move.mp3'], t('voice.tableMoveIntro')));
  enqueue({ mode: 'speech', text: t('voice.tableMove', { player: playerName, table: tableName, seat: toSeat }) });
}

/** Table dissolution — a table is being broken */
export function announceTableDissolution(tableName: string, t: TranslateFn): void {
  if (enqueueCustomAudioIfAvailable('table-dissolved')) return;
  enqueue(audioOrSpeech(['fixed/table-dissolved.mp3'], t('voice.tableDissolutionIntro')));
  enqueue({ mode: 'speech', text: t('voice.tableDissolution', { table: tableName }) });
}

/** Final Table — all players at one table */
export function announceFinalTable(t: TranslateFn): void {
  if (enqueueCustomAudioIfAvailable('final-table')) return;
  enqueue(audioOrSpeech(['fixed/final-table.mp3'], t('voice.finalTable')));
}

/** Mystery Bounty revealed — MP3 intro + speech with dynamic amount */
export function announceMysteryBounty(amount: number, t: TranslateFn): void {
  enqueue(audioOrSpeech(['fixed/mystery-bounty.mp3'], t('voice.mysteryBounty', { amount })));
  enqueue({ mode: 'speech', text: `${amount}` });
}

/** Call the Clock — MP3 intro + seconds duration MP3 */
export function announceCallTheClock(seconds: number, t: TranslateFn): void {
  if (enqueueCustomAudioIfAvailable('call-the-clock')) return;
  enqueue(audioOrSpeech(['fixed/call-the-clock.mp3'], t('voice.callTheClock', { seconds })));
  // Use dedicated seconds MP3 (e.g. "60 Sekunden" / "60 seconds")
  if (CTC_SECONDS.has(seconds)) {
    const file = `seconds/seconds-${seconds}.mp3`;
    enqueue(audioOrSpeech([file], t('voice.seconds', { n: seconds })));
  } else if (seconds >= 1 && seconds <= MAX_COUNTDOWN) {
    const file = `countdown/countdown-${String(seconds).padStart(2, '0')}.mp3`;
    enqueue(audioOrSpeech([file], `${seconds}`));
  } else {
    enqueue({ mode: 'speech', text: t('voice.seconds', { n: seconds }) });
  }
}

/**
 * Call the Clock countdown — last 10 seconds voice countdown.
 * Uses immediate mode to cut through any queued announcements.
 */
export function announceCallTheClockCountdown(second: number): void {
  if (second >= 1 && second <= MAX_COUNTDOWN) {
    const file = `countdown/countdown-${String(second).padStart(2, '0')}.mp3`;
    enqueueImmediate(audioOrSpeech([file], String(second), { rate: 0.85 }));
  }
}

/** Call the Clock expired — time's up */
export function announceCallTheClockExpired(t: TranslateFn): void {
  if (enqueueCustomAudioIfAvailable('call-the-clock-expired')) return;
  enqueue(audioOrSpeech(['fixed/time-expired.mp3'], t('voice.callTheClockExpired')));
}

/** Late registration closed — window ended */
export function announceLateRegistrationClosed(t: TranslateFn): void {
  if (enqueueCustomAudioIfAvailable('late-reg-closed')) return;
  enqueue(audioOrSpeech(['fixed/late-registration-closed.mp3'], t('voice.lateRegistrationClosed')));
}

/** Tournament winner — personalized with player name */
export function announceTournamentWinner(playerName: string, t: TranslateFn): void {
  enqueue(audioOrSpeech(['fixed/tournament-winner.mp3'], t('voice.tournamentWinner', { name: playerName })));
}

/** Speak arbitrary text via Web Speech API (used for custom user alerts). */
export function speakCustomText(text: string): void {
  enqueue({ mode: 'speech', text });
}
