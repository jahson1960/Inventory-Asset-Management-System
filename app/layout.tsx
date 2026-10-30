import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/auth-context";
import { fileUrl } from "@/lib/api-client";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Resolves the admin-configured favicon server-side so it's already correct in the HTML Next.js
 *  sends down — the client-side swap in lib/theme.ts's applyFavicon() only runs after hydration
 *  and the /settings/theme fetch resolves, so on a fresh load the browser requests the static
 *  app/favicon.ico (the stock Next.js default) first and often never re-fetches after the link's
 *  href changes out from under it — that's the "shows the black arrow most of the time" bug.
 *  GET /settings/theme is @Public(), so no auth is needed here. Falls back to the static favicon
 *  on any failure (unreachable backend, slow response, no custom favicon set) rather than ever
 *  failing the page render. */
async function resolveFaviconUrl(): Promise<string> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${apiUrl}/settings/theme`, {
      signal: controller.signal,
      next: { revalidate: 300 },
    });
    clearTimeout(timeout);
    if (!res.ok) return '/favicon.ico';
    const theme = (await res.json()) as { faviconUrl: string | null };
    return theme.faviconUrl ? fileUrl(theme.faviconUrl) : '/favicon.ico';
  } catch {
    return '/favicon.ico';
  }
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Asset & Inventory Management System",
    description: "Rome Business School Nigeria — asset, inventory and equipment tracking",
    icons: { icon: await resolveFaviconUrl() },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
