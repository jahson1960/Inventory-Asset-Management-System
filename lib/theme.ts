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
 *  in-session changes, but several browsers (Chrome included) silently ignore a same-link
 *  href mutation, so the old link is removed and a fresh one inserted with a cache-busting
 *  query param to force a re-fetch rather than relying on a (frequently stale) cached favicon. */
export function applyFavicon(faviconUrl: string | null) {
  const base = faviconUrl ? fileUrl(faviconUrl) : '/favicon.ico';
  const href = `${base}${base.includes('?') ? '&' : '?'}v=${Date.now()}`;
  document.querySelectorAll('link[rel="icon"]').forEach((el) => el.remove());
  const link = document.createElement('link');
  link.rel = 'icon';
  link.href = href;
  document.head.appendChild(link);
}

export function brandLogoUrl(logoUrl: string | null): string | null {
  return logoUrl ? fileUrl(logoUrl) : null;
}
