import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware to handle routing
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public API routes that don't require any authentication header
  const publicApiRoutes = [
    '/api/auth',          // Auth endpoints (set-key, status, logout, model-scopes)
    '/api/features',      // Public feature flags
    '/api/og',            // Open Graph image generation
    '/api/project-count', // Public project count
    '/api/v1/models',     // Public model listing
  ];

  // Public page routes
  const publicPageRoutes = [
    '/',
    '/login',
    '/callback',
    '/admin',   // Admin pages (protected by their own client-side auth)
    '/_next',
    '/favicon.ico',
  ];

  // Share routes with more specific matching
  const isShareRoute = pathname === '/share' || pathname.startsWith('/share/');

  // Check if it's a public page route
  const isPublicPageRoute = publicPageRoutes.some(route => {
    if (route === '/') return pathname === '/';
    return pathname.startsWith(route);
  });

  // Check if it's a public API route
  const isPublicApiRoute = publicApiRoutes.some(route => pathname.startsWith(route));
  
  // If it's a public page/share route, allow access
  if (isPublicPageRoute || isShareRoute) {
    return NextResponse.next();
  }

  // Defense-in-depth for API routes: require correct auth header to prevent
  // accidentally-unprotected new routes from being reachable.
  if (pathname.startsWith('/api/')) {
    // Public API routes pass through — individual handlers may still check auth
    if (isPublicApiRoute) {
      return NextResponse.next();
    }

    // Admin API routes require X-Admin-Token (except auth endpoints)
    if (pathname.startsWith('/api/admin/')) {
      // Public admin auth endpoints (register, login)
      const publicAdminAuthRoutes = [
        '/api/admin/auth/register',
        '/api/admin/auth/login',
      ];
      
      const isPublicAdminAuth = publicAdminAuthRoutes.some(route => 
        pathname.startsWith(route)
      );
      
      if (!isPublicAdminAuth) {
        const hasAdminToken = request.headers.has('X-Admin-Token');
        if (!hasAdminToken) {
          return NextResponse.json(
            { error: 'Admin authentication required' },
            { status: 401 }
          );
        }
      }
      return NextResponse.next();
    }

    // All other API routes require X-Pollinations-Key
    const hasApiKey = request.headers.has('X-Pollinations-Key');
    if (!hasApiKey) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
  }

  // Protected page routes: client-side auth (providers.tsx) checks localStorage
  // and redirects to /login if no API key is found.
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