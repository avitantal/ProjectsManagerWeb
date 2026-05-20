import type { ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Shown beneath the input while a query is active — e.g. a result count. */
  summary?: ReactNode;
  className?: string;
  autoFocus?: boolean;
}

/**
 * Generic, controlled search input — search icon, clear button, Esc-to-clear.
 * Knows nothing about what is being searched; pair it with `searchFilter`
 * from `lib/search`. Reusable across projects as-is.
 */
export function SearchBar({
  value,
  onChange,
  placeholder = 'חיפוש...',
  summary,
  className,
  autoFocus,
}: Props) {
  return (
    <div className={cn('w-full', className)}>
      <div className="relative">
        <Search
          size={15}
          className="absolute top-1/2 -translate-y-1/2 right-3 text-muted pointer-events-none"
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape' && value) {
              e.preventDefault();
              onChange('');
            }
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-label={placeholder}
          className="input pr-9 pl-9"
          dir="rtl"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-1/2 -translate-y-1/2 left-2 text-muted hover:text-text p-1 rounded-md hover:bg-bg transition-colors"
            aria-label="נקה חיפוש"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {value && summary && (
        <div className="mt-1 text-xs text-muted text-center">{summary}</div>
      )}
    </div>
  );
}
