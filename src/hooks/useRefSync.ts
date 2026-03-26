import { useEffect, useRef } from 'react';

/**
 * Creates a ref that stays in sync with the latest value.
 * Useful for reading current values inside effects without adding
 * them to dependency arrays (avoids stale closures).
 */
export function useRefSync<T>(value: T): React.RefObject<T> {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; });
  return ref;
}
