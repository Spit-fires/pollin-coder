import { getPrisma } from "./prisma";

// Simple in-memory cache for auth validation (30-second TTL)
// Avoids 2-3 upstream HTTP calls per request
const authCache = new Map<string, { user: any; expiresAt: number }>();
const AUTH_CACHE_TTL_MS = 30_000;
const AUTH_CACHE_MAX_SIZE = 500;

function getCachedAuth(apiKey: string) {
  const cached = authCache.get(apiKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.user;
  }
  authCache.delete(apiKey);
  return undefined;
}

function setCachedAuth(apiKey: string, user: any) {
  // Hard cap: evict expired entries first, then oldest entries if still over limit
  if (authCache.size >= AUTH_CACHE_MAX_SIZE) {
    const now = Date.now();
    // First pass: remove expired entries
    for (const [key, val] of authCache) {
      if (val.expiresAt <= now) authCache.delete(key);
    }
    // Second pass: if still at capacity, remove oldest entries (FIFO via insertion order)
    if (authCache.size >= AUTH_CACHE_MAX_SIZE) {
      const entriesToRemove = authCache.size - AUTH_CACHE_MAX_SIZE + 1;
      let removed = 0;
      for (const key of authCache.keys()) {
        if (removed >= entriesToRemove) break;
        authCache.delete(key);
        removed++;
      }
    }
  }
  authCache.set(apiKey, { user, expiresAt: Date.now() + AUTH_CACHE_TTL_MS });
}

/**
 * Get the current authenticated user.
 * Validates the API key against the Pollinations API to derive identity.
 * 
 * @param apiKey - API key from client (via localStorage → server action param or X-Pollinations-Key header).
 * @returns User object if authenticated, null otherwise.
 */
export async function getCurrentUser(apiKey?: string) {
  try {
    const resolvedApiKey = apiKey;

    if (!resolvedApiKey) {
      return null;
    }

    // Check cache first to avoid redundant upstream calls
    const cachedUser = getCachedAuth(resolvedApiKey);
    if (cachedUser !== undefined) {
      return cachedUser;
    }

    // Validate the API key by calling the upstream API (with timeout)
    const controller1 = new AbortController();
    const timeout1 = setTimeout(() => controller1.abort(), 10_000);
    const keyResponse = await fetch(
      "https://gen.pollinations.ai/account/key",
      {
        headers: {
          Authorization: `Bearer ${resolvedApiKey}`,
        },
        signal: controller1.signal,
      }
    );
    clearTimeout(timeout1);

    if (!keyResponse.ok) {
      return null;
    }

    const keyInfo = await keyResponse.json();
    if (!keyInfo.valid) {
      return null;
    }

    // Fetch verified profile from upstream
    const controller2 = new AbortController();
    const timeout2 = setTimeout(() => controller2.abort(), 10_000);
    const profileResponse = await fetch(
      "https://gen.pollinations.ai/account/profile",
      {
        headers: {
          Authorization: `Bearer ${resolvedApiKey}`,
        },
        signal: controller2.signal,
      }
    );
    clearTimeout(timeout2);

    if (!profileResponse.ok) {
      return null;
    }

    const profile = await profileResponse.json();
    if (!profile.email) {
      return null;
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { email: profile.email },
    });

    // Only cache non-null results to avoid blocking valid users who haven't been provisioned yet
    if (user) {
      setCachedAuth(resolvedApiKey, user);
    }

    return user;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error("Auth validation timed out");
    } else {
      console.error("Error getting current user:", error);
    }
    return null;
  }
}

/**
 * Extract API key from X-Pollinations-Key header in a request
 */
export function extractApiKeyFromHeader(request: Request): string | null {
  const apiKey = request.headers.get('X-Pollinations-Key');
  
  if (!apiKey) {
    return null;
  }

  // Validate format
  if (!/^(sk_|pk_)[a-zA-Z0-9_-]{10,500}$/.test(apiKey)) {
    return null;
  }

  return apiKey;
}

/**
 * Get the current user's ID or throw an error
 * Use this in server actions and API routes that require authentication
 * 
 * @param apiKey - API key from client (localStorage → server action param or X-Pollinations-Key header).
 */
export async function requireAuth(apiKey?: string) {
  const user = await getCurrentUser(apiKey);
  
  if (!user) {
    throw new Error("Authentication required");
  }
  
  return user;
}
