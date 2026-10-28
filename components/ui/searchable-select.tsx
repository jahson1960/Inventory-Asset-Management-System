'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

/** A dropdown filter control with a search box inside the open panel — for picking one option
 *  (e.g. a department or a person) out of a list too long to comfortably scan as a plain
 *  &lt;select&gt;. `value: ''` always means "no filter" and shows `placeholder`. */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'All',
  searchPlaceholder = 'Search…',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery ? options.filter((o) => o.label.toLowerCase().includes(normalizedQuery)) : options;

  function select(v: string) {
    onChange(v);
    setOpen(false);
  }

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) setQuery('');
        }}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-900 hover:border-slate-400"
      >
        <span className={cn('truncate', !selected && 'text-slate-400')}>{selected ? selected.label : placeholder}</span>
        <ChevronIcon />
      </button>

      {open && (
        <div className="absolute left-0 z-20 mt-1 w-full min-w-56 rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-1.5">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-slate-900 focus:border-gold focus:outline-none"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            <li>
              <button
                type="button"
                onClick={() => select('')}
                className={cn('block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50', !value && 'font-medium text-gold-dark')}
              >
                {placeholder}
              </button>
            </li>
            {filtered.length === 0 ? (
              <li className="px-3 py-1.5 text-sm text-slate-400">No matches</li>
            ) : (
              filtered.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => select(o.value)}
                    className={cn(
                      'block w-full truncate px-3 py-1.5 text-left text-sm hover:bg-slate-50',
                      value === o.value && 'font-medium text-gold-dark',
                    )}
                  >
                    {o.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-slate-400"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
