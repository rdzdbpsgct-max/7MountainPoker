import { useRef, useEffect } from 'react';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), a[href]';

/**
 * Accessibility hook for modal dialogs.
 * - Focuses the first focusable element on mount
 * - Traps focus within the dialog (Tab / Shift+Tab cycle)
 * - Returns focus to the previously focused element on unmount
 * - Closes on Escape key press
 * Returns a ref to attach to the dialog's content container.
 */
export function useDialogA11y(onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  // Store onClose in a ref so the keydown handler always uses the latest version
  // without re-running the effect (which would re-focus and scroll to top)
  const onCloseRef = useRef(onClose);
  // eslint-disable-next-line react-hooks/refs -- updating ref to latest onClose without re-running effect
  onCloseRef.current = onClose;

  useEffect(() => {
    // Remember the element that was focused before the dialog opened
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const el = dialogRef.current;
    if (!el) return;

    // Focus the first interactive element inside the dialog (once on mount)
    const focusable = el.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    focusable?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }

      // Focus trap: cycle Tab within dialog
      if (e.key === 'Tab') {
        const focusableElements = Array.from(
          el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        );
        if (focusableElements.length === 0) return;

        const first = focusableElements[0]!;
        const last = focusableElements[focusableElements.length - 1]!;

        if (e.shiftKey) {
          // Shift+Tab: if on first element, wrap to last
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          // Tab: if on last element, wrap to first
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKey);

    return () => {
      window.removeEventListener('keydown', handleKey);
      // Return focus to the previously focused element
      previousFocusRef.current?.focus();
    };
  }, []);

  return dialogRef;
}
