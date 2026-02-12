/**
 * Edge-compatible auth utilities.
 * Identical to lib/auth.ts but imports from lib/prisma-edge.ts (HTTP transport).
 * Used by routes with `export const runtime = "edge"`.
 */

import { getPrismaEdge } from "./prisma-edge";

// Simple in-memory cache for auth validation (30-second TTL)
const authCache = new Map<string, { user: any; expiresAt: number }>();
const AUTH_CACHE_TTL_MS = 30_000;
const AUTH_CACHE_MAX_SIZE = 500;

// Negative cache for failed auth lookups (10-second TTL)
const authNegativeCache = new Map<string, number>();
const AUTH_NEGATIVE_CACHE_TTL_MS = 10_000;

function getCachedAuth(apiKey: string) {
  const cached = authCache.get(apiKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.user;
  }
  authCache.delete(apiKey);
  return undefined;
}

function setCachedAuth(apiKey: string, user: any) {
  if (authCache.size >= AUTH_CACHE_MAX_SIZE) {
    const now = Date.now();
    for (const [key, val] of authCache) {
      if (val.expiresAt <= now) authCache.delete(key);
    }
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
 * Get the current authenticated user (edge-compatible).
 * Validates the API key against the Pollinations API to derive identity.
 */
export async function getCurrentUserEdge(apiKey?: string) {
  try {
    const resolvedApiKey = apiKey;

    if (!resolvedApiKey) {
      return null;
    }

    const cachedUser = getCachedAuth(resolvedApiKey);
    if (cachedUser !== undefined) {
      return cachedUser;
    }

    const negativeExpiry = authNegativeCache.get(resolvedApiKey);
    if (negativeExpiry && negativeExpiry > Date.now()) {
      return null;
    }
    authNegativeCache.delete(resolvedApiKey);

    // Validate API key upstream
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
      authNegativeCache.set(resolvedApiKey, Date.now() + AUTH_NEGATIVE_CACHE_TTL_MS);
      return null;
    }

    const keyInfo = await keyResponse.json();
    if (!keyInfo.valid) {
      authNegativeCache.set(resolvedApiKey, Date.now() + AUTH_NEGATIVE_CACHE_TTL_MS);
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

    const prisma = getPrismaEdge();
    const user = await prisma.user.findUnique({
      where: { email: profile.email },
    });

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
 * Extract API key from X-Pollinations-Key header in a request.
 * Pure header parsing — duplicated here to avoid importing lib/auth.ts
 * which would pull Node.js-only Prisma into the edge bundle.
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
