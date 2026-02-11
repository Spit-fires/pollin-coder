import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware to handle routing
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/login',
    '/callback',
    '/api/auth',
    '/api/features',
    '/api/og',
    '/api/project-count',
    '/api/v1/models',
    '/admin',
    '/_next',
    '/favicon.ico',
  ];

  // Share routes with more specific matching
  const isShareRoute = pathname === '/share' || pathname.startsWith('/share/');
  
  // Check if the current path is public
  const isPublicRoute = publicRoutes.some(route => {
    if (route === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(route);
  });
  
  // If it's a public or share route, allow access
  if (isPublicRoute || isShareRoute) {
    return NextResponse.next();
  }

  // Protected routes: client-side auth (providers.tsx) checks localStorage
  // and redirects to /login if no API key is found.
  // API routes validate the X-Pollinations-Key header independently.
  return NextResponse.next();
}

// Match all routes except static files
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}; 