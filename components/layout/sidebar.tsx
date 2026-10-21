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

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
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
    // Also collapse the mobile off-canvas drawer whenever navigation happens, so tapping a
    // link doesn't leave the drawer open over the newly-loaded page.
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!user) return null;

  const logoUrl = brandLogoUrl(theme.logoUrl);

  function toggleGroup(title: string) {
    setOpenGroup((prev) => (prev === title ? null : title));
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="no-print fixed inset-0 z-40 bg-slate-900/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <nav
        className={cn(
          'no-print fixed inset-y-0 left-0 z-50 w-64 overflow-y-auto bg-navy px-3 py-5 transition-transform duration-200 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'md:static md:z-auto md:w-60 md:shrink-0 md:translate-x-0 md:overflow-visible',
        )}
      >
        <div className="mb-6 flex items-start justify-between px-2">
          <div>
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
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white md:hidden"
            aria-label="Close menu"
          >
            <CloseIcon />
          </button>
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
    </>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
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
