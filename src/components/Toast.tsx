import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { ToastItem } from '../domain/toast';
import { dismissToast, subscribeToasts } from '../domain/toast';

/**
 * Renders toast notifications via a portal at the bottom of the viewport.
 * Place once in App.tsx — no Context wrapping needed.
 */
export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setItems), []);

  const handleDismiss = useCallback((id: number) => {
    dismissToast(id);
  }, []);

  if (items.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
      {items.map((item) => (
        <div
          key={item.id}
          role="status"
          aria-live="polite"
          onClick={() => handleDismiss(item.id)}
          className="pointer-events-auto px-4 py-2 bg-gray-900/90 dark:bg-gray-800/95 text-white text-sm font-medium rounded-xl shadow-lg backdrop-blur-sm animate-fade-in cursor-pointer"
        >
          {item.message}
        </div>
      ))}
    </div>,
    document.body,
  );
}
