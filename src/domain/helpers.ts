// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let idCounter = 0;
/** Generates a unique level ID using timestamp and incrementing counter. */
export function generateId(): string {
  return `lvl_${Date.now()}_${idCounter++}_${Math.random().toString(36).slice(2, 6)}`;
}

let playerIdCounter = 0;
/** Generates a unique player ID using timestamp and incrementing counter. */
export function generatePlayerId(): string {
  return `player_${Date.now()}_${playerIdCounter++}_${Math.random().toString(36).slice(2, 6)}`;
}

let chipIdCounter = 0;
/** Generates a unique chip denomination ID using timestamp and incrementing counter. */
export function generateChipId(): string {
  return `chip_${Date.now()}_${chipIdCounter++}_${Math.random().toString(36).slice(2, 6)}`;
}

// ---------------------------------------------------------------------------
// Spinner rounding helper
// ---------------------------------------------------------------------------

/**
 * Rounds a spinner input value to the nearest `step` boundary based on direction.
 * When the user clicks the spinner arrow, the raw value changes by `step`.
 * This helper snaps it to a clean multiple so e.g. 1500 + 1000 -> 2000 (not 2500).
 */
export function snapSpinnerValue(raw: number, prev: number, step: number, min = 1): number {
  const diff = raw - prev;
  const absDiff = Math.abs(diff);
  let val: number;
  if (absDiff > 0 && absDiff <= step) {
    // Spinner arrow click: snap to nearest step boundary
    val = diff > 0
      ? Math.ceil(raw / step) * step
      : Math.floor(raw / step) * step;
  } else {
    // Direct keyboard input: accept as-is
    val = raw;
  }
  return Math.max(min, val);
}
