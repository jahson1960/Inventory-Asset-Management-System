'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_GROUPS, isNavItemVisible, type NavGroup } from '@/lib/nav';
import { useAuth } from '@/contexts/auth-context';
import { usePermissions } from '@/hooks/use-permissions';
import { useApi } from '@/hooks/use-api';
import { brandLogoUrl } from '@/lib/theme';
import { cn } from '@/lib/cn';
import type { DisplaySettingsRecord } from '@/lib/types';

function groupContainsPath(group: NavGroup, pathname: string): boolean {
  return group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}

export function Sidebar() {
  const { user, theme } = useAuth();
  const { can } = usePermissions();
  const { data: displaySettings } = useApi<DisplaySettingsRecord>('/settings/display');
  const scanEnabled = displaySettings?.scanEnabled ?? false;
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  useEffect(() => {
    const activeGroup = NAV_GROUPS.find((group) => groupContainsPath(group, pathname));
    if (activeGroup) {
      // Navigating to a page reveals its group, collapsing whichever other one was open.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpenGroup(activeGroup.title);
    }
  }, [pathname]);

  if (!user) return null;

  const logoUrl = brandLogoUrl(theme.logoUrl);

  function toggleGroup(title: string) {
    setOpenGroup((prev) => (prev === title ? null : title));
  }

  return (
    <nav className="no-print hidden w-60 shrink-0 bg-navy px-3 py-5 md:block">
      <div className="mb-6 px-2">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded, arbitrary origin/size
          <img src={logoUrl} alt="Logo" className="max-h-10 max-w-full object-contain" />
        ) : (
          <>
            <p className="text-sm font-semibold text-white">{theme.companyName || 'Asset & Inventory'}</p>
            <p className="text-xs text-slate-400">Rome Business School</p>
          </>
        )}
      </div>
      {NAV_GROUPS.map((group) => {
        const visibleItems = group.items
          .filter((item) => isNavItemVisible(item, user.role, can))
          .filter((item) => item.href !== '/scan' || scanEnabled);
        if (visibleItems.length === 0) return null;

        if (visibleItems.length === 1) {
          const item = visibleItems[0];
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <div key={group.title} className="mb-1">
              <Link
                href={item.href}
                className={cn(
                  'block rounded-md px-2 py-1.5 text-sm',
                  active ? 'bg-gold text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white',
                )}
              >
                {item.label}
              </Link>
            </div>
          );
        }

        const open = openGroup === group.title;

        return (
          <div key={group.title} className="mb-1">
            <button
              type="button"
              onClick={() => toggleGroup(group.title)}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/40 hover:text-white/70"
            >
              {group.title}
              <ChevronIcon className={cn('transition-transform', open && 'rotate-90')} />
            </button>
            {open && (
              <ul className="mt-0.5 space-y-0.5">
                {visibleItems.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'block rounded-md px-2 py-1.5 text-sm',
                          active ? 'bg-gold text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white',
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function ChevronIcon({ className }: { className?: string }) {
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
      className={className}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
