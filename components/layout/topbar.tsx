'use client';

import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { NotificationBell } from './notification-bell';

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function MenuIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="no-print flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <button
          type="button"
          onClick={onMenuClick}
          className="-ml-1 flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
          aria-label="Open menu"
        >
          <MenuIcon />
        </button>
        <span className="text-sm font-semibold text-slate-900">Asset &amp; Inventory</span>
      </div>
      <div className="hidden md:block" />
      <div className="flex items-center gap-3">
        <NotificationBell />
        <div className="text-right">
          <p className="text-sm font-medium text-slate-900">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-slate-500">{user.role.replace('_', ' ')}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-light text-sm font-semibold text-gold-dark">
          {getInitials(user.firstName, user.lastName)}
        </div>
        <Button variant="secondary" size="sm" onClick={logout}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
