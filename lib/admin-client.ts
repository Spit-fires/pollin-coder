/**
 * Client-side admin authenticated fetch wrapper
 * Automatically includes admin token from localStorage in request headers
 */

const ADMIN_TOKEN_KEY = 'admin_token';
const ADMIN_TOKEN_CHECKSUM_KEY = 'admin_token_checksum';

/**
 * Simple checksum to detect tampering or corruption
 */
function generateChecksum(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

/**
 * Admin authenticated fetch wrapper that includes X-Admin-Token header
 */
export async function adminFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const token = getAdminToken();

  if (!token) {
    // Redirect to admin login if no token found
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/login';
    }
    throw new Error('Not authenticated as admin');
  }

  const headers = new Headers(options?.headers);
  headers.set('X-Admin-Token', token);
  // Only set Content-Type if not already set (allows FormData etc.)
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Get admin token from localStorage (with integrity check)
 */
export function getAdminToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const encoded = localStorage.getItem(ADMIN_TOKEN_KEY);
    const storedChecksum = localStorage.getItem(ADMIN_TOKEN_CHECKSUM_KEY);

    if (!encoded) return null;

    const decoded = atob(encoded);

    if (storedChecksum) {
      const calculatedChecksum = generateChecksum(decoded);
      if (calculatedChecksum !== storedChecksum) {
        console.warn('Admin token checksum mismatch - clearing token');
        clearAdminToken();
        return null;
      }
    }

    return decoded;
  } catch (error) {
    console.error('Failed to retrieve admin token:', error);
    clearAdminToken();
    return null;
  }
}

/**
 * Set admin token in localStorage (with encoding and integrity check)
 */
export function setAdminToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const encoded = btoa(token);
    const checksum = generateChecksum(token);
    localStorage.setItem(ADMIN_TOKEN_KEY, encoded);
    localStorage.setItem(ADMIN_TOKEN_CHECKSUM_KEY, checksum);
  } catch (error) {
    console.error('Failed to store admin token:', error);
  }
}

/**
 * Clear admin token from localStorage
 */
export function clearAdminToken(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_TOKEN_CHECKSUM_KEY);
}

/**
 * Check if user is authenticated as admin
 */
export function isAdminAuthenticated(): boolean {
  return getAdminToken() !== null;
}

/**
 * Admin logout helper - clears token and redirects to login
 */
export async function adminLogout(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    // Call logout endpoint
    const token = getAdminToken();
    if (token) {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        headers: {
          'X-Admin-Token': token,
        },
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear token and redirect
    clearAdminToken();
    window.location.href = '/admin/login';
  }
}
