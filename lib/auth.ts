import { cookies } from "next/headers";
import { getPrisma } from "./prisma";

// Simple in-memory cache for auth validation (30-second TTL)
// Avoids 2-3 upstream HTTP calls per request
const authCache = new Map<string, { user: any; expiresAt: number }>();
const AUTH_CACHE_TTL_MS = 30_000;

function getCachedAuth(apiKey: string) {
  const cached = authCache.get(apiKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.user;
  }
  authCache.delete(apiKey);
  return undefined;
}

function setCachedAuth(apiKey: string, user: any) {
  authCache.set(apiKey, { user, expiresAt: Date.now() + AUTH_CACHE_TTL_MS });
  // Evict stale entries periodically (keep cache bounded)
  if (authCache.size > 500) {
    const now = Date.now();
    for (const [key, val] of authCache) {
      if (val.expiresAt <= now) authCache.delete(key);
    }
  }
}

/**
 * Get the current authenticated user from cookies.
 * Validates the API key against the Pollinations API to derive identity,
 * rather than trusting the client-readable profile cookie.
 * Returns null if not authenticated or key is invalid.
 */
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const apiKeyCookie = cookieStore.get("pollinations_api_key");

    if (!apiKeyCookie?.value) {
      return null;
    }

    // Check cache first to avoid redundant upstream calls
    const cachedUser = getCachedAuth(apiKeyCookie.value);
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
          Authorization: `Bearer ${apiKeyCookie.value}`,
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

    // Fetch verified profile from upstream (not from cookie)
    const controller2 = new AbortController();
    const timeout2 = setTimeout(() => controller2.abort(), 10_000);
    const profileResponse = await fetch(
      "https://gen.pollinations.ai/account/profile",
      {
        headers: {
          Authorization: `Bearer ${apiKeyCookie.value}`,
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

    // Cache the result (cache null too to avoid repeated failed lookups)
    setCachedAuth(apiKeyCookie.value, user);

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
 * Get the current user's ID or throw an error
 * Use this in server actions that require authentication
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("Authentication required");
  }
  
  return user;
}
