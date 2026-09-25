'use client';

import { useEffect, useRef, useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { api, ApiError } from '@/lib/api-client';
import { timeAgo } from '@/lib/time-ago';
import type { NotificationRecord } from '@/lib/types';
import { cn } from '@/lib/cn';

export function NotificationBell() {
  const { data: countData, refetch: refetchCount } = useApi<{ count: number }>('/notifications/unread-count');
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (!open || notifications !== null) return;
    // Marks the start of an in-flight fetch-on-open request (standard shape for this pattern).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    api
      .get<NotificationRecord[]>('/notifications')
      .then(setNotifications)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load notifications'))
      .finally(() => setLoading(false));
  }, [open, notifications]);

  async function markRead(id: string) {
    try {
      await api.patch(`/notifications/${id}/read`, {});
      setNotifications((prev) => prev?.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)) ?? null);
      refetchCount();
    } catch {
      // best-effort; leave the item as-is if it fails
    }
  }

  async function markAllRead() {
    try {
      await api.patch('/notifications/read-all', {});
      setNotifications((prev) => prev?.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })) ?? null);
      refetchCount();
    } catch {
      // best-effort
    }
  }

  const unreadCount = countData?.count ?? 0;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notifications</p>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs font-medium text-gold-dark hover:underline">
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">Loading…</p>
            ) : error ? (
              <p className="px-4 py-6 text-center text-sm text-red-600">{error}</p>
            ) : !notifications || notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">No notifications yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => !n.isRead && markRead(n.id)}
                      className={cn('block w-full px-4 py-3 text-left hover:bg-slate-50', !n.isRead && 'bg-blue-50/50')}
                    >
                      <p className="text-sm text-slate-900">{n.title}</p>
                      {n.body && <p className="mt-0.5 text-xs text-slate-500">{n.body}</p>}
                      <p className="mt-1 text-xs text-slate-400">{timeAgo(n.createdAt)}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
