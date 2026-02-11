/**
 * Client-side authenticated fetch wrapper
 * Automatically includes API key from localStorage in request headers
 */

import { getApiKey } from './secure-storage';

/**
 * Authenticated fetch wrapper that includes X-Pollinations-Key header
 * @param url - The URL to fetch
 * @param options - Standard fetch options
 * @returns Promise with the fetch response
 * @throws Error if no API key is found in localStorage
 */
export async function authFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const apiKey = getApiKey();

  if (!apiKey) {
    // Redirect to login if no API key found
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Not authenticated');
  }

  return fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      'X-Pollinations-Key': apiKey,
    },
  });
}

/**
 * Check if user is authenticated (has valid API key in localStorage)
 */
export function isAuthenticated(): boolean {
  return getApiKey() !== null;
}

/**
 * Logout helper - clears API key and redirects to login
 */
export function logout(): void {
  if (typeof window === 'undefined') return;

  // Clear the API key
  const { clearApiKey } = require('./secure-storage');
  clearApiKey();

  // Redirect to login
  window.location.href = '/login';
}
