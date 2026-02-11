/**
 * Client-side admin authenticated fetch wrapper
 * Automatically includes admin token from localStorage in request headers
 */

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

  return fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      'X-Admin-Token': token,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Get admin token from localStorage
 */
export function getAdminToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('admin_token');
}

/**
 * Set admin token in localStorage
 */
export function setAdminToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem('admin_token', token);
}

/**
 * Clear admin token from localStorage
 */
export function clearAdminToken(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem('admin_token');
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
