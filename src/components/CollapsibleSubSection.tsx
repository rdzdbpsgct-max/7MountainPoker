import { useState, type ReactNode } from 'react';
import { ChevronIcon } from './ChevronIcon';

interface Props {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function CollapsibleSubSection({ title, summary, defaultOpen = false, children }: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-300 dark:border-gray-700/50 rounded-lg overflow-hidden shadow-md shadow-gray-300/30 dark:shadow-black/10">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        className="group w-full flex items-center justify-between px-4 py-2.5 bg-gray-200/80 dark:bg-gray-800/40 hover:bg-gray-300/60 dark:hover:bg-gray-700/40 hover:shadow-md hover:shadow-gray-400/30 dark:hover:shadow-black/15 transition-all duration-200 text-left"
      >
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</span>
        <div className="flex items-center gap-2 shrink-0">
          {!isOpen && summary && (
            <span className="text-xs text-gray-600 dark:text-gray-500 truncate max-w-[200px]">
              {summary}
            </span>
          )}
          <ChevronIcon open={isOpen} className="text-gray-500 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200" />
        </div>
      </button>
      {isOpen && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900/20 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}
