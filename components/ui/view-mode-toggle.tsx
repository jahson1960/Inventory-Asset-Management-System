'use client';

import { cn } from '@/lib/cn';

export function ViewModeToggle({ mode, onChange }: { mode: 'TABLE' | 'CARD'; onChange: (mode: 'TABLE' | 'CARD') => void }) {
  return (
    <div className="inline-flex items-center rounded-md border border-slate-300 bg-white p-0.5">
      <button
        type="button"
        title="Table view"
        onClick={() => onChange('TABLE')}
        className={cn('rounded p-1.5', mode === 'TABLE' ? 'bg-gold text-white' : 'text-slate-500 hover:text-slate-900')}
      >
        <TableIcon />
      </button>
      <button
        type="button"
        title="Card view"
        onClick={() => onChange('CARD')}
        className={cn('rounded p-1.5', mode === 'CARD' ? 'bg-gold text-white' : 'text-slate-500 hover:text-slate-900')}
      >
        <CardIcon />
      </button>
    </div>
  );
}

function TableIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="9" y1="4" x2="9" y2="20" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="7" height="7" rx="1" />
      <rect x="14" y="4" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
