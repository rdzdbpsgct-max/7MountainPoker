import type {
  TimerState,
  Level,
  ChipConfig,
  ChipDenomination,
  Player,
  PayoutConfig,
  RebuyConfig,
  AddOnConfig,
  BountyConfig,
  Table,
  ExtendedLeagueStanding,
  PotResult,
  PlayerPayout,
  DisplayScreenConfig,
  DisplayLayout,
  Currency,
} from './types';

// ---------------------------------------------------------------------------
// Display-State payload — everything the TV window needs to render DisplayMode
// ---------------------------------------------------------------------------

export interface DisplayStatePayload {
  timerState: TimerState;
  levels: Level[];
  chipConfig?: ChipConfig | undefined;
  /** Serialized colorUpMap — Map cannot be structured-cloned reliably across browsers */
  colorUpSchedule?: { levelIndex: number; denoms: ChipDenomination[] }[] | undefined;
  tournamentName: string;
  activePlayerCount: number;
  totalPlayerCount: number;
  isBubble: boolean;
  isLastHand: boolean;
  isHandForHand: boolean;
  players: Player[];
  dealerIndex: number;
  buyIn: number;
  payout: PayoutConfig;
  rebuy: RebuyConfig;
  addOn: AddOnConfig;
  bounty: BountyConfig;
  averageStack: number;
  tournamentElapsed: number;
  tables?: Table[] | undefined;
  showDealerBadges?: boolean | undefined;
  leagueName?: string | undefined;
  leagueStandings?: ExtendedLeagueStanding[] | undefined;
  /** Side pot calculator data for TV display (only present when calculator is active) */
  sidePotData?: { pots: PotResult[]; total: number; payouts?: PlayerPayout[] | undefined } | undefined;
  /** Which secondary screens to show (user-configured). undefined = all enabled. */
  displayScreens?: DisplayScreenConfig[] | undefined;
  /** Rotation interval in seconds. undefined = default 15. */
  displayRotationInterval?: number | undefined;
  /** Display layout variant. undefined = 'standard'. */
  displayLayout?: DisplayLayout | undefined;
  /** Currency code for display. undefined = 'EUR'. */
  currency?: Currency | undefined;
}

// ---------------------------------------------------------------------------
// Message types sent from Admin → TV window
// ---------------------------------------------------------------------------

export const DISPLAY_CONTRACT_NAME = 'display-sync' as const;
export const DISPLAY_CONTRACT_VERSION = 1 as const;

type DisplayMessageBody =
  | { type: 'full-state'; payload: DisplayStatePayload }
  | { type: 'timer-tick'; payload: { remainingSeconds: number; status: string; currentLevelIndex: number } }
  | { type: 'call-the-clock'; payload: { durationSeconds: number; soundEnabled: boolean; voiceEnabled: boolean } }
  | { type: 'call-the-clock-dismiss' }
  | { type: 'request-state' }
  | { type: 'close' };

export type DisplayMessage = DisplayMessageBody & {
  contract: typeof DISPLAY_CONTRACT_NAME;
  version: typeof DISPLAY_CONTRACT_VERSION;
};

export function withDisplayContract(msg: DisplayMessageBody): DisplayMessage {
  return {
    ...msg,
    contract: DISPLAY_CONTRACT_NAME,
    version: DISPLAY_CONTRACT_VERSION,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isDisplayMessage(value: unknown): value is DisplayMessage {
  if (!isRecord(value)) return false;
  if (value.contract !== DISPLAY_CONTRACT_NAME) return false;
  if (value.version !== DISPLAY_CONTRACT_VERSION) return false;
  if (typeof value.type !== 'string') return false;

  switch (value.type) {
    case 'full-state':
      return isRecord(value.payload);
    case 'timer-tick':
      return isRecord(value.payload)
        && typeof value.payload.remainingSeconds === 'number'
        && typeof value.payload.status === 'string'
        && typeof value.payload.currentLevelIndex === 'number';
    case 'call-the-clock':
      return isRecord(value.payload)
        && typeof value.payload.durationSeconds === 'number'
        && typeof value.payload.soundEnabled === 'boolean'
        && typeof value.payload.voiceEnabled === 'boolean';
    case 'call-the-clock-dismiss':
    case 'request-state':
    case 'close':
      return true;
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Channel helpers
// ---------------------------------------------------------------------------

const CHANNEL_NAME = 'poker-timer-sync';

export function createDisplayChannel(): BroadcastChannel {
  return new BroadcastChannel(CHANNEL_NAME);
}

export function sendDisplayMessage(channel: BroadcastChannel, msg: DisplayMessage): void {
  try {
    channel.postMessage(msg);
  } catch {
    // Channel may be closed
  }
}

// ---------------------------------------------------------------------------
// Serialization helpers for colorUpMap
// ---------------------------------------------------------------------------

export function serializeColorUpMap(
  map: Map<number, ChipDenomination[]> | undefined,
): { levelIndex: number; denoms: ChipDenomination[] }[] | undefined {
  if (!map || map.size === 0) return undefined;
  return Array.from(map.entries()).map(([levelIndex, denoms]) => ({ levelIndex, denoms }));
}

export function deserializeColorUpMap(
  schedule: { levelIndex: number; denoms: ChipDenomination[] }[] | undefined,
): Map<number, ChipDenomination[]> | undefined {
  if (!schedule || schedule.length === 0) return undefined;
  return new Map(schedule.map(({ levelIndex, denoms }) => [levelIndex, denoms]));
}
