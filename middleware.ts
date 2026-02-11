import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware to handle authentication and routing
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public routes that don't require authentication
  const publicRoutes = [
    '/', // Home page should be accessible
    '/login',
    '/callback',
    '/api/auth/set-key',
    '/api/auth/logout',
    '/api/auth/status',
    '/api/features',
    '/api/og',
    '/api/project-count',
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

  // Check for API key cookie (authentication)
  const apiKey = request.cookies.get('pollinations_api_key')?.value;

  // If no API key and trying to access protected route, redirect to login
  if (!apiKey) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Basic cookie format validation — reject obviously invalid values
  // (Full validation happens in individual routes via getCurrentUser)
  const isValidFormat = /^(sk_|pk_)[a-zA-Z0-9_-]{10,500}$/.test(apiKey);
  if (!isValidFormat) {
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('pollinations_api_key');
    return response;
  }

  // API key exists and has valid format, allow the request to continue
  // Individual routes will validate the key and check authorization
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