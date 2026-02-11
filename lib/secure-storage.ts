/**
 * Secure localStorage wrapper for API key management
 * Uses base64 encoding with basic integrity checking
 */

const API_KEY_STORAGE_KEY = 'pollen_api_key';
const CHECKSUM_KEY = 'pollen_api_key_checksum';

/**
 * Simple checksum to detect tampering or corruption
 */
function generateChecksum(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Base64 encode a string
 */
function encode(value: string): string {
  if (typeof window === 'undefined') return value;
  try {
    return btoa(value);
  } catch (e) {
    console.error('Failed to encode value:', e);
    return value;
  }
}

/**
 * Base64 decode a string
 */
function decode(value: string): string {
  if (typeof window === 'undefined') return value;
  try {
    return atob(value);
  } catch (e) {
    console.error('Failed to decode value:', e);
    return value;
  }
}

/**
 * Store API key in localStorage with base64 encoding
 */
export function setApiKey(apiKey: string): boolean {
  if (typeof window === 'undefined') {
    console.warn('setApiKey called on server side');
    return false;
  }

  try {
    // Validate API key format before storing
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('Invalid API key format');
    }

    // Basic format validation (sk_ or pk_ prefix)
    if (!/^(sk_|pk_)[a-zA-Z0-9_-]{10,500}$/.test(apiKey)) {
      throw new Error('API key does not match expected format');
    }

    const encoded = encode(apiKey);
    const checksum = generateChecksum(apiKey);

    localStorage.setItem(API_KEY_STORAGE_KEY, encoded);
    localStorage.setItem(CHECKSUM_KEY, checksum);

    return true;
  } catch (error) {
    console.error('Failed to store API key:', error);
    return false;
  }
}

/**
 * Retrieve API key from localStorage and decode
 * Returns null if key is missing, corrupted, or invalid
 */
export function getApiKey(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const encoded = localStorage.getItem(API_KEY_STORAGE_KEY);
    const storedChecksum = localStorage.getItem(CHECKSUM_KEY);

    if (!encoded) {
      return null;
    }

    const decoded = decode(encoded);

    // Verify checksum if available
    if (storedChecksum) {
      const calculatedChecksum = generateChecksum(decoded);
      if (calculatedChecksum !== storedChecksum) {
        console.warn('API key checksum mismatch - possible tampering detected');
        clearApiKey();
        return null;
      }
    }

    // Validate format after decoding
    if (!/^(sk_|pk_)[a-zA-Z0-9_-]{10,500}$/.test(decoded)) {
      console.warn('Stored API key has invalid format');
      clearApiKey();
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('Failed to retrieve API key:', error);
    clearApiKey(); // Clear corrupted data
    return null;
  }
}

/**
 * Remove API key from localStorage
 */
export function clearApiKey(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    localStorage.removeItem(CHECKSUM_KEY);
  } catch (error) {
    console.error('Failed to clear API key:', error);
  }
}

/**
 * Check if API key exists in localStorage
 */
export function hasApiKey(): boolean {
  return getApiKey() !== null;
}
