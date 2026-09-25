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

export function applyFavicon(faviconUrl: string | null) {
  const href = faviconUrl ? fileUrl(faviconUrl) : '/favicon.ico';
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = href;
}

export function brandLogoUrl(logoUrl: string | null): string | null {
  return logoUrl ? fileUrl(logoUrl) : null;
}
