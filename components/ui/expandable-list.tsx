'use client';

import { Fragment, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from './table';
import { Card } from './card';
import { Button } from './button';

export interface ExpandableListColumn<T> {
  header: string;
  render: (item: T) => ReactNode;
}

export interface ExpandableListProps<T> {
  items: T[];
  mode: 'TABLE' | 'CARD';
  getRowKey: (item: T) => string;
  columns: ExpandableListColumn<T>[];
  renderCard: (item: T) => ReactNode;
  renderExpanded: (item: T) => ReactNode;
  viewFullHref: (item: T) => string;
  emptyMessage: string;
  /** Adds a "Print" link (to `${viewFullHref(item)}?print=true`) alongside "View full page". */
  enablePrint?: boolean;
}

/**
 * A record list that renders as either a table or a card grid (admin-configurable via
 * Settings → Display), where clicking a row/card expands it in place with a Close button —
 * a quick-peek alongside the item's full page (linked via `viewFullHref`), not a replacement
 * for it.
 */
export function ExpandableList<T>({
  items,
  mode,
  getRowKey,
  columns,
  renderCard,
  renderExpanded,
  viewFullHref,
  emptyMessage,
  enablePrint = false,
}: ExpandableListProps<T>) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <Card>
        <EmptyState message={emptyMessage} />
      </Card>
    );
  }

  function toggle(key: string) {
    setExpandedKey((prev) => (prev === key ? null : key));
  }

  if (mode === 'CARD') {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const key = getRowKey(item);
          const expanded = expandedKey === key;
          if (expanded) {
            return (
              <div key={key} className="col-span-full">
                <Table>
                  <Thead>
                    <Tr>
                      {columns.map((col) => (
                        <Th key={col.header}>{col.header}</Th>
                      ))}
                    </Tr>
                  </Thead>
                  <Tbody>
                    <Tr className="cursor-pointer" onClick={() => toggle(key)}>
                      {columns.map((col) => (
                        <Td key={col.header}>{col.render(item)}</Td>
                      ))}
                    </Tr>
                  </Tbody>
                </Table>
                <Card className="mt-2">
                  <div className="p-4">
                    {renderExpanded(item)}
                    <ExpandedFooter href={viewFullHref(item)} enablePrint={enablePrint} onClose={() => setExpandedKey(null)} />
                  </div>
                </Card>
              </div>
            );
          }
          return (
            <Card key={key}>
              <button type="button" onClick={() => toggle(key)} className="w-full p-4 text-left">
                {renderCard(item)}
              </button>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <Card>
      <Table>
        <Thead>
          <Tr>
            {columns.map((col) => (
              <Th key={col.header}>{col.header}</Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {items.map((item) => {
            const key = getRowKey(item);
            const expanded = expandedKey === key;
            return (
              <Fragment key={key}>
                <Tr className="cursor-pointer" onClick={() => toggle(key)}>
                  {columns.map((col) => (
                    <Td key={col.header}>{col.render(item)}</Td>
                  ))}
                </Tr>
                {expanded && (
                  <Tr>
                    <Td colSpan={columns.length} className="bg-slate-50">
                      {renderExpanded(item)}
                      <ExpandedFooter href={viewFullHref(item)} enablePrint={enablePrint} onClose={() => setExpandedKey(null)} />
                    </Td>
                  </Tr>
                )}
              </Fragment>
            );
          })}
        </Tbody>
      </Table>
    </Card>
  );
}

function ExpandedFooter({
  href,
  enablePrint,
  onClose,
}: {
  href: string;
  enablePrint: boolean;
  onClose: () => void;
}) {
  return (
    <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
      <div className="flex items-center gap-3">
        <Link href={href} className="text-xs font-medium text-gold-dark hover:underline">
          View full page
        </Link>
        {enablePrint && (
          <Link href={`${href}?print=true`} className="text-xs font-medium text-gold-dark hover:underline">
            Print
          </Link>
        )}
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={onClose}>
        Close
      </Button>
    </div>
  );
}
