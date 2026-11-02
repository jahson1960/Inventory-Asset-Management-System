import type { ThemeSettingsRecord } from '@/lib/types';
import { fileUrl } from '@/lib/api-client';

export const DEFAULT_THEME: ThemeSettingsRecord = {
  navy: '#1e2340',
  navyDark: '#14172b',
  gold: '#b8862f',
  goldDark: '#96691f',
  goldLight: '#f2e3c0',
  cream: '#f6f1e7',
  creamDark: '#ece3d0',
  logoUrl: null,
  faviconUrl: null,
  companyName: null,
};

export type ColorKey = 'navy' | 'navyDark' | 'gold' | 'goldDark' | 'goldLight' | 'cream' | 'creamDark';

const THEME_CSS_VARS: Record<ColorKey, string> = {
  navy: '--color-navy',
  navyDark: '--color-navy-dark',
  gold: '--color-gold',
  goldDark: '--color-gold-dark',
  goldLight: '--color-gold-light',
  cream: '--color-cream',
  creamDark: '--color-cream-dark',
};

export function applyTheme(theme: ThemeSettingsRecord) {
  const root = document.documentElement;
  for (const key of Object.keys(THEME_CSS_VARS) as ColorKey[]) {
    root.style.setProperty(THEME_CSS_VARS[key], theme[key]);
  }
  applyFavicon(theme.faviconUrl);
}

/** Live-updates the tab icon after the theme loads/changes client-side (e.g. right after an
 *  admin uploads a new favicon in Settings → Display). The initial favicon is already correct
 *  from generateMetadata() in app/layout.tsx server-rendering it — this only needs to handle
 *  in-session changes. Next.js's own head manager keeps a React-owned <link rel="icon"> in the
 *  DOM, so removing/recreating that node here (as an earlier version did) raced React's next head
 *  reconciliation — on the very next navigation React tried to remove a node that was already
 *  gone, throwing "Cannot read properties of null (reading 'removeChild')" and aborting the
 *  commit, which is what made the whole app need a second click to actually render a navigation.
 *  Mutating the existing link's href in place (a fresh query string still forces a re-fetch) is
 *  safe because it doesn't touch node identity; a new link is only created if none exists yet. */
export function applyFavicon(faviconUrl: string | null) {
  const base = faviconUrl ? fileUrl(faviconUrl) : '/favicon.ico';
  const href = `${base}${base.includes('?') ? '&' : '?'}v=${Date.now()}`;
  const existing = document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]');
  if (existing.length > 0) {
    existing.forEach((link) => {
      link.href = href;
    });
  } else {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = href;
    document.head.appendChild(link);
  }
}

export function brandLogoUrl(logoUrl: string | null): string | null {
  return logoUrl ? fileUrl(logoUrl) : null;
}
