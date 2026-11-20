import { cn } from '@/lib/cn';
import { EmptyState } from './table';

export interface MobileCardField<T> {
  label: string;
  value: (row: T) => React.ReactNode;
  hide?: (row: T) => boolean;
}

interface MobileCardListProps<T> {
  rows: T[];
  keyField: (row: T, index: number) => string | number;
  title: (row: T) => React.ReactNode;
  subtitle?: (row: T) => React.ReactNode;
  badge?: (row: T) => React.ReactNode;
  fields?: MobileCardField<T>[];
  actions?: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
  emptyMessage: string;
}

export function MobileCardList<T>({
  rows,
  keyField,
  title,
  subtitle,
  badge,
  fields = [],
  actions,
  onRowClick,
  emptyMessage,
}: MobileCardListProps<T>) {
  if (rows.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  const visibleFields = fields;

  return (
    <div className="divide-y divide-slate-100">
      {rows.map((row, index) => {
        const fieldsToShow = visibleFields.filter((f) => !f.hide?.(row));
        return (
          <div
            key={keyField(row, index)}
            className={cn('flex flex-col gap-2 p-4', onRowClick && 'cursor-pointer active:bg-slate-50')}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-medium text-slate-900">{title(row)}</div>
                {subtitle?.(row) != null && <div className="truncate text-xs text-slate-500">{subtitle(row)}</div>}
              </div>
              {badge && <div className="flex-shrink-0">{badge(row)}</div>}
            </div>
            {fieldsToShow.length > 0 && (
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                {fieldsToShow.map((field, i) => (
                  <div key={i} className="min-w-0">
                    <dt className="text-xs text-slate-400">{field.label}</dt>
                    <dd className="truncate text-slate-700">{field.value(row)}</dd>
                  </div>
                ))}
              </dl>
            )}
            {actions && (
              <div className="flex items-center gap-3 pt-1" onClick={(e) => e.stopPropagation()}>
                {actions(row)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
