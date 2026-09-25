import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { TOKEN_COOKIE_NAME } from '@/lib/auth-token';

/** Lightweight presence check only — the real authorization decision is made by the API's
 *  JwtAuthGuard/RolesGuard on every request. This just avoids flashing protected UI before
 *  redirecting an obviously-signed-out visitor to /login. */
export function proxy(request: NextRequest) {
  const hasToken = request.cookies.has(TOKEN_COOKIE_NAME);
  const { pathname } = request.nextUrl;

  if (pathname === '/login') {
    if (hasToken) return NextResponse.redirect(new URL('/dashboard', request.url));
    return NextResponse.next();
  }

  if (!hasToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
